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
        const fileInput = page.locator(`${GOODS_IMAGE_UPLOAD_CONTAINER_SELECTOR} input[type="file"]`).first();
        await fileInput.waitFor({ timeout: 10000, state: 'attached' });
        await fileInput.setInputFiles(filePaths);
        await page.waitForTimeout(3000);
        logger.info(`${PLATFORM_NAME}商品主图逻辑：已在商品图区域执行上传，count=${filePaths.length}`);
        return filePaths.length;
    } catch (error) {
        logger.warn(`${PLATFORM_NAME}商品主图逻辑：商品图上传失败: ${error?.message || error}`);
        return 0;
    }
}

async function fillSkuProductCode(page, productCode) {
    if (!productCode) {
        logger.info(`${PLATFORM_NAME}SKU编码逻辑：productCode 为空，跳过填写`);
        return 0;
    }

    try {
        const result = await page.evaluate(async ({ containerSelector, value }) => {
            const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            const container = document.querySelector(containerSelector);
            if (!(container instanceof HTMLElement)) {
                throw new Error(`未找到 SKU 区域: ${containerSelector}`);
            }

            const table = container.querySelector('table');
            if (!(table instanceof HTMLTableElement)) {
                throw new Error('未找到 SKU 表格');
            }

            const headerCells = Array.from(table.querySelectorAll('thead th'));
            const columnIndex = headerCells.findIndex((cell) => String(cell.textContent || '').includes('SKU编码'));
            if (columnIndex < 0) {
                throw new Error('未找到“SKU编码”列');
            }

            const headerCell = headerCells[columnIndex];
            const tableRows = Array.from(table.querySelectorAll('tr'));
            const bodyRows = tableRows.filter((row) => row.querySelectorAll('td').length > columnIndex);
            const columnInputs = [];
            let filledCount = 0;

            for (const row of bodyRows) {
                const cells = Array.from(row.querySelectorAll('td'));
                const cell = cells[columnIndex];
                if (!(cell instanceof HTMLElement)) continue;

                const inputs = Array.from(cell.querySelectorAll('input'));
                inputs.forEach((input) => {
                    if (input instanceof HTMLInputElement) {
                        columnInputs.push(input);
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
                            ariaLabel.includes('SKU编码')
                            || placeholder.includes('SKU编码')
                            || name.includes('SKU')
                            || dataLabel.includes('SKU编码')
                            || nearbyText.includes('SKU编码')
                        ) {
                            columnInputs.push(input);
                        }
                    }
                });
            }

            for (const input of columnInputs) {
                input.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
                input.focus();
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                await sleep(50);
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.blur();
                filledCount += 1;
                await sleep(50);
            }

            return {
                columnIndex,
                rowCount: bodyRows.length,
                filledCount,
                headerText: String(headerCell?.textContent || '').trim(),
                candidateInputCount: columnInputs.length
            };
        }, {
            containerSelector: SKU_AND_PRICE_CONTAINER_SELECTOR,
            value: productCode
        });

        logger.info(`${PLATFORM_NAME}SKU编码逻辑：已填写 SKU编码 列，columnIndex=${result.columnIndex}, headerText=${result.headerText}, rowCount=${result.rowCount}, candidateInputCount=${result.candidateInputCount}, filledCount=${result.filledCount}, value=${productCode}`);
        return result.filledCount || 0;
    } catch (error) {
        logger.warn(`${PLATFORM_NAME}SKU编码逻辑执行失败: ${error?.message || error}`);
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
        let productCodeFilledCount = 0;
        if (images.length > 0) {
            deletedCount = await clearGoodsImages(page);
            const preparedImages = await prepareImages(images, imageManager);
            tempFiles.push(...preparedImages.tempFiles);
            preparedImageCount = preparedImages.filePaths.length;
            logger.info(`${PLATFORM_NAME}图片已预处理完成，count=${preparedImageCount}`);
            uploadedImageCount = await uploadGoodsImages(page, preparedImages.filePaths);
        }

        productCodeFilledCount = await fillSkuProductCode(page, productCode);

        return {
            success: !!titleFilled && !!shortTitleFilled,
            message: titleFilled && shortTitleFilled
                ? `${PLATFORM_NAME}基础信息已填写完成`
                : `${PLATFORM_NAME}基础信息填写失败`,
            data: {
                pageKeptOpen: true,
                titleFilled,
                shortTitleFilled,
                titleValue: title,
                shortTitleValue: shortTitle,
                deletedCount,
                preparedImageCount,
                uploadedImageCount,
                productCode,
                productCodeFilledCount
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
