import fs from 'fs';
import { getOrCreateBrowser } from '../services/BrowserService.js';
import { ImageManager } from '../services/ImageManager.js';
import { PageOperator } from '../services/PageOperator.js';
import { logger } from '../utils/logger.js';

const PLATFORM_KEY = 'kuaishou_shop';
const PLATFORM_NAME = '快手小店';
const DEFAULT_CREATE_URL = 'https://s.kwaixiaodian.com/zone/goods/nexus/self/release/add';
const BASE_INFO_TITLE_SELECTOR = '#BaseInfo > :nth-child(2) input';
const BASE_INFO_SHORT_TITLE_SELECTOR = '#BaseInfo > :nth-child(3) input';
const GOODS_IMAGE_UPLOAD_CONTAINER_SELECTOR = '#GoodsImg > :nth-child(2)';
const GOODS_DETAIL_IMAGE_UPLOAD_CONTAINER_SELECTOR = '#GoodsImg > :nth-child(6)';
const SKU_AND_PRICE_CONTAINER_SELECTOR = '#SkuAndPrice > :nth-child(4)';
const GOODS_IMAGE_DELETE_CONTAINER_SELECTORS = [
    '#GoodsImg > :nth-child(2)',
    '#GoodsImg > :nth-child(3)',
    '#GoodsImg > :nth-child(4)',
    '#GoodsImg > :nth-child(6)'
];
const LOGIN_USER_SELECTORS = ['.user-info', '.account-info', '.avatar', '.header-user', '[class*="merchant"]'];
const LOGIN_BUTTON_SELECTORS = ['.login-btn', '.login-button', '.auth-btn', 'text=登录', 'text=扫码登录'];

function resolveCreateUrl(sameId) {
    const normalizedSameId = String(sameId || '').trim();
    return normalizedSameId
        ? `${DEFAULT_CREATE_URL}?sameId=${encodeURIComponent(normalizedSameId)}`
        : DEFAULT_CREATE_URL;
}

function normalizeLimitedText(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength);
}

async function checkLogin(page) {
    for (const selector of LOGIN_USER_SELECTORS) {
        try {
            const locator = page.locator(selector).first();
            if (await locator.count()) {
                return true;
            }
        } catch {
            continue;
        }
    }

    for (const selector of LOGIN_BUTTON_SELECTORS) {
        try {
            const locator = page.locator(selector).first();
            if (await locator.count()) {
                return false;
            }
        } catch {
            continue;
        }
    }

    return !/login|signin|passport/i.test(page.url());
}

async function fillExactInput(page, selector, value, fieldLabel) {
    try {
        const input = page.locator(selector).first();
        await input.waitFor({ timeout: 10000, state: 'visible' });
        await input.scrollIntoViewIfNeeded().catch(() => undefined);
        await input.click({ clickCount: 3 }).catch(() => undefined);
        await input.fill('').catch(() => undefined);
        await input.fill(value);
        logger.info(`${PLATFORM_NAME}${fieldLabel}已填写: ${value}`);
        return true;
    } catch (error) {
        logger.warn(`${PLATFORM_NAME}${fieldLabel}填写失败: ${error?.message || error}`);
        return false;
    }
}

async function clearGoodsImages(page) {
    try {
        await page.waitForTimeout(500);
        const deleteCount = await page.evaluate((selectors) => {
            let count = 0;

            selectors.forEach((selector) => {
                const container = document.querySelector(selector);
                if (!(container instanceof HTMLElement)) return;

                const targets = Array.from(container.querySelectorAll('[aria-label="close-circle"]'));
                targets.forEach((target) => {
                    if (!(target instanceof HTMLElement)) return;
                    target.dispatchEvent(new MouseEvent('mousedown', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));
                    count += 1;
                });
            });

            return count;
        }, GOODS_IMAGE_DELETE_CONTAINER_SELECTORS);

        if (deleteCount > 0) {
            await page.waitForTimeout(500);
        }

        logger.info(`${PLATFORM_NAME}商品主图逻辑：已执行原图删除，deleteCount=${deleteCount}`);
        return deleteCount;
    } catch (error) {
        logger.warn(`${PLATFORM_NAME}商品主图逻辑：原图删除执行失败: ${error?.message || error}`);
        return 0;
    }
}

async function prepareImages(images, imageManager) {
    const filePaths = [];
    const tempFiles = [];

    for (let i = 0; i < images.length; i += 1) {
        const source = String(images[i] || '').trim();
        if (!source) continue;

        if (/^https?:\/\//i.test(source)) {
            const tempPath = await imageManager.downloadImage(source, `${PLATFORM_KEY}_${Date.now()}_${i}`);
            filePaths.push(tempPath);
            tempFiles.push(tempPath);
            continue;
        }

        if (fs.existsSync(source)) {
            filePaths.push(source);
        }
    }

    return { filePaths, tempFiles };
}

async function uploadGoodsImages(page, filePaths) {
    if (!filePaths.length) {
        return 0;
    }

    try {
        const beforeCount = await page.locator(`${GOODS_IMAGE_UPLOAD_CONTAINER_SELECTOR} [aria-label="close-circle"]`).count().catch(() => 0);
        const fileInput = page.locator(`${GOODS_IMAGE_UPLOAD_CONTAINER_SELECTOR} input[type="file"]`).first();
        await fileInput.waitFor({ timeout: 10000, state: 'attached' });
        await fileInput.setInputFiles(filePaths);
        logger.info(`${PLATFORM_NAME}商品主图逻辑：已触发商品图上传，beforeCount=${beforeCount}, expectedAdd=${filePaths.length}`);
        await page.waitForFunction(
            ({ selector, targetCount }) => {
                const container = document.querySelector(selector);
                if (!(container instanceof HTMLElement)) return false;
                const uploadedCount = container.querySelectorAll('[aria-label="close-circle"]').length;
                const loadingCount = container.querySelectorAll('.loading,[class*="loading"],[class*="uploading"],[class*="progress"]').length;
                return uploadedCount >= targetCount && loadingCount === 0;
            },
            {
                selector: GOODS_IMAGE_UPLOAD_CONTAINER_SELECTOR,
                targetCount: beforeCount + filePaths.length
            },
            { timeout: 300000 }
        );
        const uploadedCount = await page.locator(`${GOODS_IMAGE_UPLOAD_CONTAINER_SELECTOR} [aria-label="close-circle"]`).count().catch(() => 0);
        logger.info(`${PLATFORM_NAME}商品主图逻辑：商品图上传确认完成，uploadedCount=${uploadedCount}, expectedTotal=${beforeCount + filePaths.length}`);
        return Math.max(0, uploadedCount - beforeCount);
    } catch (error) {
        logger.warn(`${PLATFORM_NAME}商品主图逻辑：商品图上传失败: ${error?.message || error}`);
        return 0;
    }
}

async function uploadGoodsDetailImages(page, filePaths) {
    if (!filePaths.length) {
        return 0;
    }

    try {
        const beforeCount = await page.locator(`${GOODS_DETAIL_IMAGE_UPLOAD_CONTAINER_SELECTOR} [aria-label="close-circle"]`).count().catch(() => 0);
        const fileInput = page.locator(`${GOODS_DETAIL_IMAGE_UPLOAD_CONTAINER_SELECTOR} input[type="file"]`).first();
        await fileInput.waitFor({ timeout: 10000, state: 'attached' });
        await fileInput.setInputFiles(filePaths);
        logger.info(`${PLATFORM_NAME}商品详情图逻辑：已触发详情图上传，beforeCount=${beforeCount}, expectedAdd=${filePaths.length}`);
        await page.waitForFunction(
            ({ selector, targetCount }) => {
                const container = document.querySelector(selector);
                if (!(container instanceof HTMLElement)) return false;
                const uploadedCount = container.querySelectorAll('[aria-label="close-circle"]').length;
                const loadingCount = container.querySelectorAll('.loading,[class*="loading"],[class*="uploading"],[class*="progress"]').length;
                return uploadedCount >= targetCount && loadingCount === 0;
            },
            {
                selector: GOODS_DETAIL_IMAGE_UPLOAD_CONTAINER_SELECTOR,
                targetCount: beforeCount + filePaths.length
            },
            { timeout: 300000 }
        );
        const uploadedCount = await page.locator(`${GOODS_DETAIL_IMAGE_UPLOAD_CONTAINER_SELECTOR} [aria-label="close-circle"]`).count().catch(() => 0);
        logger.info(`${PLATFORM_NAME}商品详情图逻辑：详情图上传确认完成，uploadedCount=${uploadedCount}, expectedTotal=${beforeCount + filePaths.length}`);
        return Math.max(0, uploadedCount - beforeCount);
    } catch (error) {
        logger.warn(`${PLATFORM_NAME}商品详情图逻辑：详情图上传失败: ${error?.message || error}`);
        return 0;
    }
}

async function clickSubmitAudit(page) {
    try {
        const button = page.locator('button').filter({ hasText: '提交审核' }).first();
        await button.waitFor({ timeout: 10000, state: 'visible' });
        await button.scrollIntoViewIfNeeded().catch(() => undefined);
        await button.click({ delay: 100 });
        logger.info(`${PLATFORM_NAME}提交流程：已点击“提交审核”按钮`);
        logger.info(`${PLATFORM_NAME}提交流程：等待成功提示“商品上传成功”`);
        await page.getByText('商品上传成功').waitFor({
            timeout: 20000,
            state: 'visible'
        });
        logger.info(`${PLATFORM_NAME}提交流程：已确认“商品上传成功”提示`);
        return true;
    } catch (error) {
        logger.warn(`${PLATFORM_NAME}提交流程执行失败或超时: ${error?.message || error}`);
        return false;
    }
}

async function fillTableColumnInputs(page, { containerSelector, columnKeyword, value, logPrefix }) {
    try {
        const result = await page.evaluate(({ containerSelector, columnKeyword, markerPrefix }) => {
            const getNodePath = (node) => {
                if (!(node instanceof Element)) return '';
                const parts = [];
                let current = node;
                while (current && current instanceof Element && parts.length < 6) {
                    let part = current.tagName.toLowerCase();
                    if (current.id) {
                        part += `#${current.id}`;
                    } else if (current.classList.length) {
                        part += `.${Array.from(current.classList).slice(0, 2).join('.')}`;
                    }
                    const parent = current.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
                        if (siblings.length > 1) {
                            part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
                        }
                    }
                    parts.unshift(part);
                    current = current.parentElement;
                }
                return parts.join(' > ');
            };
            const getInputSelector = (node) => {
                if (!(node instanceof HTMLInputElement)) return '';
                if (node.id) return `#${node.id}`;
                const path = [];
                let current = node;
                while (current && current instanceof Element && path.length < 8) {
                    let part = current.tagName.toLowerCase();
                    if (current.classList.length) {
                        part += `.${Array.from(current.classList).slice(0, 2).join('.')}`;
                    }
                    const parent = current.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
                        if (siblings.length > 1) {
                            part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
                        }
                    }
                    path.unshift(part);
                    current = current.parentElement;
                    if (current?.id) {
                        path.unshift(`#${current.id}`);
                        break;
                    }
                }
                return path.join(' > ');
            };
            const container = document.querySelector(containerSelector);
            if (!(container instanceof HTMLElement)) {
                throw new Error(`未找到 SKU 区域: ${containerSelector}`);
            }

            const headerRoot = container.querySelector('.kwaishop-goods-nexus-pc-table-header');
            const bodyRoot = container.querySelector('.kwaishop-goods-nexus-pc-table-body');
            if (!(headerRoot instanceof HTMLElement)) {
                throw new Error('未找到 SKU 表头区域');
            }
            if (!(bodyRoot instanceof HTMLElement)) {
                throw new Error('未找到 SKU 表体区域');
            }

            const headerTable = headerRoot.querySelector('table');
            const bodyTable = bodyRoot.querySelector('table');
            const headerCells = Array.from((headerTable || headerRoot).querySelectorAll('th'));
            const columnIndex = headerCells.findIndex((cell) => {
                const text = String(cell.textContent || '').trim().toLowerCase();
                return text === columnKeyword || text.includes(columnKeyword);
            });
            if (columnIndex < 0) {
                throw new Error(`未找到“${columnKeyword}”列`);
            }

            const headerCell = headerCells[columnIndex];
            const bodyRows = Array.from((bodyTable || bodyRoot).querySelectorAll('tr')).filter((row) => row.querySelectorAll('td').length > columnIndex);
            const columnInputs = [];
            const candidateInputs = [];
            const taggedInputIds = [];

            for (const row of bodyRows) {
                const cells = Array.from(row.querySelectorAll('td'));
                const cell = cells[columnIndex];
                if (!(cell instanceof HTMLElement)) continue;

                const inputs = Array.from(cell.querySelectorAll('input'));
                inputs.forEach((input) => {
                    if (input instanceof HTMLInputElement) {
                        const inputId = `${markerPrefix}-${Math.random().toString(36).slice(2, 10)}`;
                        input.setAttribute('data-yishe-sku-code-id', inputId);
                        columnInputs.push(input);
                        taggedInputIds.push(inputId);
                        candidateInputs.push({
                            source: 'table-column',
                            value: input.value,
                            placeholder: input.getAttribute('placeholder') || '',
                            name: input.getAttribute('name') || '',
                            className: input.className || '',
                            path: getNodePath(input),
                            selector: getInputSelector(input),
                            tempSelector: `[data-yishe-sku-code-id="${inputId}"]`,
                            cellText: String(cell.textContent || '').trim().slice(0, 120)
                        });
                    }
                });
            }

            if (!columnInputs.length) {
                const fallbackInputs = Array.from(container.querySelectorAll('input')).filter((input) => input instanceof HTMLInputElement);
                fallbackInputs.forEach((input) => {
                    if (input instanceof HTMLInputElement) {
                        const ariaLabel = String(input.getAttribute('aria-label') || '');
                        const placeholder = String(input.getAttribute('placeholder') || '');
                        const name = String(input.getAttribute('name') || '');
                        const dataLabel = String(input.getAttribute('data-label') || '');
                        const nearbyText = String(input.parentElement?.textContent || '');
                        if (
                            ariaLabel.toLowerCase().includes(columnKeyword)
                            || placeholder.toLowerCase().includes(columnKeyword)
                            || name.toLowerCase().includes(columnKeyword)
                            || dataLabel.toLowerCase().includes(columnKeyword)
                            || nearbyText.toLowerCase().includes(columnKeyword)
                        ) {
                            const inputId = `${markerPrefix}-${Math.random().toString(36).slice(2, 10)}`;
                            input.setAttribute('data-yishe-sku-code-id', inputId);
                            columnInputs.push(input);
                            taggedInputIds.push(inputId);
                            candidateInputs.push({
                                source: 'fallback-search',
                                value: input.value,
                                placeholder,
                                name,
                                className: input.className || '',
                                ariaLabel,
                                dataLabel,
                                path: getNodePath(input),
                                selector: getInputSelector(input),
                                tempSelector: `[data-yishe-sku-code-id="${inputId}"]`,
                                cellText: nearbyText.trim().slice(0, 120)
                            });
                        }
                    }
                });
            }

            return {
                containerFound: true,
                tableFound: !!headerTable || !!bodyTable,
                headerRootFound: true,
                bodyRootFound: true,
                containerSelector,
                columnIndex,
                rowCount: bodyRows.length,
                headerText: String(headerCell?.textContent || '').trim(),
                headerTexts: headerCells.map((cell) => String(cell.textContent || '').trim()),
                candidateInputCount: columnInputs.length,
                candidateInputs: candidateInputs.slice(0, 10),
                taggedInputIds
            };
        }, {
            containerSelector,
            columnKeyword: String(columnKeyword || '').trim().toLowerCase(),
            markerPrefix: `yishe-${String(columnKeyword || 'column').trim().toLowerCase()}`
        });

        logger.info(`${PLATFORM_NAME}${logPrefix}：容器和表格扫描结果`, {
            containerSelector: result.containerSelector,
            containerFound: result.containerFound,
            tableFound: result.tableFound,
            headerRootFound: result.headerRootFound,
            bodyRootFound: result.bodyRootFound,
            headerTexts: result.headerTexts,
            columnIndex: result.columnIndex,
            headerText: result.headerText,
            rowCount: result.rowCount,
            candidateInputCount: result.candidateInputCount,
            value
        });
        logger.info(`${PLATFORM_NAME}${logPrefix}：候选输入框明细`, result.candidateInputs || []);

        const fillDebug = [];
        let filledCount = 0;
        const bodyRoot = page.locator(`${containerSelector} .kwaishop-goods-nexus-pc-table-body`).first();
        await bodyRoot.scrollIntoViewIfNeeded().catch(() => undefined);

        for (const inputId of result.taggedInputIds || []) {
            const tempSelector = `[data-yishe-sku-code-id="${inputId}"]`;
            try {
                const input = page.locator(tempSelector).first();
                await input.waitFor({ timeout: 5000, state: 'visible' });
                const beforeValue = await input.inputValue().catch(() => '');
                await input.focus().catch(() => undefined);
                await input.evaluate((node) => {
                    if (node instanceof HTMLInputElement) {
                        node.select();
                    }
                }).catch(() => undefined);
                await page.keyboard.press('Backspace').catch(() => undefined);
                await input.type(String(value), { delay: 30 });
                await input.blur().catch(() => undefined);
                await page.waitForTimeout(150);
                const afterValue = await input.inputValue().catch(() => '');
                fillDebug.push({
                    tempSelector,
                    beforeValue,
                    afterValue
                });
                if (String(afterValue).trim() === String(value)) {
                    filledCount += 1;
                }
            } catch (error) {
                fillDebug.push({
                    tempSelector,
                    error: error?.message || String(error || '')
                });
            }
        }

        await page.evaluate(() => {
            document.querySelectorAll('[data-yishe-sku-code-id]').forEach((node) => {
                if (node instanceof HTMLElement) {
                    node.removeAttribute('data-yishe-sku-code-id');
                }
            });
        }).catch(() => undefined);

        logger.info(`${PLATFORM_NAME}${logPrefix}：输入执行明细`, fillDebug.slice(0, 10));
        return filledCount;
    } catch (error) {
        logger.warn(`${PLATFORM_NAME}${logPrefix}执行失败: ${error?.message || error}`);
        return 0;
    }
}

export async function publishToKuaishouShop(publishInfo = {}) {
    const imageManager = new ImageManager();
    const pageOperator = new PageOperator();
    const tempFiles = [];
    let page = null;

    try {
        const settings = publishInfo.platformOptions || publishInfo.publishOptions || publishInfo.platformSettings?.[PLATFORM_KEY] || {};
        const sameId = String(settings.sameId || publishInfo.sameId || '').trim();
        const targetUploadUrl = resolveCreateUrl(sameId);
        const title = normalizeLimitedText(publishInfo.title || publishInfo.name || '', 30);
        const shortTitle = normalizeLimitedText(settings.shortTitle ?? publishInfo.shortTitle ?? title, 10);
        const images = Array.isArray(publishInfo.images) ? publishInfo.images.filter(Boolean) : [];
        const productCode = String(
            settings.productCode
            ?? publishInfo.productCode
            ?? publishInfo.data?.productCode
            ?? ''
        ).trim();
        const inventoryValue = '999';

        logger.info(`开始执行${PLATFORM_NAME}发布流程`);
        logger.info(`${PLATFORM_NAME}目标发布页: ${targetUploadUrl}`);

        const browser = await getOrCreateBrowser();
        page = await browser.newPage();
        await pageOperator.setupAntiDetection(page);

        await page.goto(targetUploadUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await page.waitForTimeout(3000);

        const isLoggedIn = await checkLogin(page);
        if (!isLoggedIn) {
            return {
                success: false,
                message: `请先登录${PLATFORM_NAME}商家后台`,
                data: {
                    pageKeptOpen: true
                }
            };
        }

        const titleFilled = title
            ? await fillExactInput(page, BASE_INFO_TITLE_SELECTOR, title, '商品标题')
            : false;
        const shortTitleFilled = shortTitle
            ? await fillExactInput(page, BASE_INFO_SHORT_TITLE_SELECTOR, shortTitle, '短标题')
            : false;

        let deletedCount = 0;
        let preparedImageCount = 0;
        let uploadedImageCount = 0;
        let uploadedDetailImageCount = 0;
        let productCodeFilledCount = 0;
        let inventoryFilledCount = 0;
        let submitAuditClicked = false;
        if (images.length > 0) {
            deletedCount = await clearGoodsImages(page);
            const preparedImages = await prepareImages(images, imageManager);
            tempFiles.push(...preparedImages.tempFiles);
            preparedImageCount = preparedImages.filePaths.length;
            logger.info(`${PLATFORM_NAME}图片已预处理完成，count=${preparedImageCount}`);
            uploadedImageCount = await uploadGoodsImages(page, preparedImages.filePaths);
            if (uploadedImageCount < preparedImageCount) {
                return {
                    success: false,
                    message: `${PLATFORM_NAME}商品图上传未完成`,
                    data: {
                        pageKeptOpen: true,
                        deletedCount,
                        preparedImageCount,
                        uploadedImageCount
                    }
                };
            }
            uploadedDetailImageCount = await uploadGoodsDetailImages(page, preparedImages.filePaths);
            if (uploadedDetailImageCount < preparedImageCount) {
                return {
                    success: false,
                    message: `${PLATFORM_NAME}商品详情图上传未完成`,
                    data: {
                        pageKeptOpen: true,
                        deletedCount,
                        preparedImageCount,
                        uploadedImageCount,
                        uploadedDetailImageCount
                    }
                };
            }
        }

        if (!productCode) {
            logger.info(`${PLATFORM_NAME}SKU编码逻辑：productCode 为空，跳过填写`);
        } else {
            productCodeFilledCount = await fillTableColumnInputs(page, {
                containerSelector: SKU_AND_PRICE_CONTAINER_SELECTOR,
                columnKeyword: 'sku',
                value: productCode,
                logPrefix: 'SKU编码逻辑'
            });
        }

        inventoryFilledCount = await fillTableColumnInputs(page, {
            containerSelector: SKU_AND_PRICE_CONTAINER_SELECTOR,
            columnKeyword: '库存',
            value: inventoryValue,
            logPrefix: '库存逻辑'
        });

        submitAuditClicked = await clickSubmitAudit(page);

        return {
            success: !!titleFilled && !!shortTitleFilled && !!submitAuditClicked,
            message: titleFilled && shortTitleFilled && submitAuditClicked
                ? `${PLATFORM_NAME}发布流程已提交`
                : `${PLATFORM_NAME}发布流程未完成`,
            data: {
                pageKeptOpen: true,
                titleFilled,
                shortTitleFilled,
                titleValue: title,
                shortTitleValue: shortTitle,
                deletedCount,
                preparedImageCount,
                uploadedImageCount,
                uploadedDetailImageCount,
                productCode,
                productCodeFilledCount,
                inventoryValue,
                inventoryFilledCount,
                submitAuditClicked
            }
        };
    } catch (error) {
        logger.error(`${PLATFORM_NAME}发布失败:`, error);
        return {
            success: false,
            message: error?.message || `${PLATFORM_NAME}发布失败`,
            data: {
                pageKeptOpen: true
            }
        };
    } finally {
        tempFiles.forEach((file) => imageManager.deleteTempFile(file));
        if (page) {
            logger.info(`${PLATFORM_NAME}调试模式：保留页面，不自动关闭 tab`);
        }
    }
}

export const kuaishouShopPublisher = { publish: publishToKuaishouShop };

export default kuaishouShopPublisher;
