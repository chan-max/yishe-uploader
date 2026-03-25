import { getOrCreateBrowser } from '../services/BrowserService.js';
import { ImageManager } from '../services/ImageManager.js';
import { PageOperator } from '../services/PageOperator.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

function toUserFriendlyPath(filePath) {
    return String(filePath || '').replace(/\\/g, '/');
}

function getPathFileName(filePath) {
    const normalizedPath = String(filePath || '').replace(/\\/g, '/');
    if (!normalizedPath) {
        return '';
    }
    return path.posix.basename(normalizedPath);
}

function resolveDoudianCreateUrl(defaultUrl, copyId) {
    const normalizedCopyId = String(copyId || '').trim();
    if (!normalizedCopyId) {
        return defaultUrl;
    }
    return `https://fxg.jinritemai.com/ffa/g/create?copyid=${encodeURIComponent(normalizedCopyId)}`;
}

function normalizeDoudianTitle(title) {
    return String(title || '').trim().slice(0, 30);
}

class DoudianPublisher {
    constructor() {
        this.platformKey = 'doudian';
        this.platformName = '抖店';
        this.uploadUrl = 'https://fxg.jinritemai.com/ffa/g/create';
        this.imageManager = new ImageManager();
        this.pageOperator = new PageOperator();
    }

    async publish(publishInfo = {}) {
        let page = null;
        const tempFiles = [];

        try {
            const settings = publishInfo.platformOptions || publishInfo.publishOptions || publishInfo.platformSettings?.[this.platformKey] || {};
            const title = normalizeDoudianTitle(publishInfo.title || publishInfo.name || '');
            const images = Array.isArray(publishInfo.images) && publishInfo.images.length > 0
                ? publishInfo.images.filter(Boolean)
                : (Array.isArray(publishInfo.imageSources) ? publishInfo.imageSources.filter(Boolean) : []);
            const targetImages = images.slice(0, 5);
            const copyId = String(settings.copyId || publishInfo.copyId || '').trim();
            const targetCreateUrl = resolveDoudianCreateUrl(this.uploadUrl, copyId);

            logger.info('开始执行抖店商品图片上传流程');
            logger.info('抖店发布入参摘要:', {
                copyId,
                targetCreateUrl,
                imageCount: targetImages.length,
                title,
                fileInputStartIndex: Number(settings.fileInputStartIndex ?? publishInfo.fileInputStartIndex ?? 2)
            });

            const browser = await getOrCreateBrowser();
            logger.info('抖店已获取浏览器实例，准备创建新页面');
            page = await browser.newPage();
            logger.info('抖店新页面创建成功');
            await this.pageOperator.setupAntiDetection(page);
            logger.info('抖店页面反检测设置完成');

            logger.info(`抖店准备打开商品发布页: ${targetCreateUrl}`);
            await page.goto(targetCreateUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            await page.waitForTimeout(5000);
            logger.info(`抖店当前页面: ${page.url()}`);
            logger.info(`抖店当前标题: ${await page.title().catch(() => '')}`);

            const isLoggedIn = await this._checkLogin(page);
            if (!isLoggedIn) {
                return {
                    success: false,
                    message: '请先登录抖店商家后台',
                    data: {
                        uploaded: 0,
                        requested: targetImages.length
                    }
                };
            }

            logger.info('抖店登录状态校验通过');
            const titleFilled = title ? await this._fillTitle(page, title) : false;
            // 商品主图逻辑：标题填写后，展开主图操作区，为后续主图上传做准备。
            if (titleFilled) {
                await this._hoverMaterialButtonGuider(page);
            }
            let uploadResult = {
                requested: targetImages.length,
                availableInputs: 0,
                startIndex: 0,
                uploadedPaths: []
            };

            if (targetImages.length > 0) {
                const preparedImages = await this._prepareImages(targetImages);
                tempFiles.push(...preparedImages.tempFiles);
                logger.info(`抖店准备上传的图片数量: ${preparedImages.filePaths.length}`);
                logger.info('抖店准备上传的图片路径:', preparedImages.filePaths.map((item) => toUserFriendlyPath(item)));
                logger.info('抖店图片预处理结果:', {
                    tempFileCount: preparedImages.tempFiles.length,
                    fileNames: preparedImages.filePaths.map((item) => getPathFileName(item))
                });

                if (preparedImages.filePaths.length > 0) {
                    uploadResult = await this._uploadImagesToSeparateInputs(
                        page,
                        preparedImages.filePaths.slice(0, 5),
                        Number(settings.fileInputStartIndex ?? publishInfo.fileInputStartIndex ?? 2)
                    );
                } else {
                    logger.warn('抖店图片路径预处理后为空，跳过文件输入步骤');
                }
            } else {
                logger.info('当前未提供图片，先跳过文件输入步骤');
            }

            const uploaded = uploadResult.uploadedPaths.length;

            return {
                success: titleFilled || uploaded > 0,
                message: titleFilled
                    ? (uploaded > 0
                        ? `抖店标题已填写，商品图片已上传 ${uploaded}/${uploadResult.requested} 张`
                        : '抖店标题已填写，图片步骤暂未执行或未完成')
                    : (uploaded > 0
                        ? `抖店商品图片已上传 ${uploaded}/${uploadResult.requested} 张，但标题未填写成功`
                        : '抖店标题和图片步骤都未完成'),
                data: {
                    uploaded,
                    requested: uploadResult.requested,
                    availableInputs: uploadResult.availableInputs,
                    startIndex: uploadResult.startIndex,
                    uploadedPaths: uploadResult.uploadedPaths.map((item) => toUserFriendlyPath(item)),
                    uploadedNames: uploadResult.uploadedPaths.map((item) => getPathFileName(item)),
                    titleFilled,
                    titleValue: titleFilled ? title : '',
                    pageKeptOpen: true
                }
            };
        } catch (error) {
            logger.error('抖店图片上传失败:', error);
            return {
                success: false,
                message: error?.message || '抖店图片上传失败'
            };
        } finally {
            tempFiles.forEach((file) => this.imageManager.deleteTempFile(file));
        }
    }

    async _uploadImagesToSeparateInputs(page, filePaths, preferredStartIndex = 2) {
        const requested = filePaths.length;
        logger.info(`抖店上传参数: requested=${requested}, preferredStartIndex=${preferredStartIndex}`);
        await page.waitForLoadState('domcontentloaded').catch(() => undefined);
        await page.waitForTimeout(2000);
        // 商品主图逻辑：仅定位“主图”字段区域下的文件输入框，避免误命中页面上其他上传入口。
        logger.info('抖店页面已完成基础加载，准备扫描主图区域文件输入框');

        const mainImageInputSelector = '[attr-field-id="主图"] input[type="file"]';

        try {
            await page.waitForSelector(mainImageInputSelector, {
                timeout: 15000,
                state: 'attached'
            });
            logger.info(`抖店已检测到主图文件输入框选择器: ${mainImageInputSelector}`);
        } catch {
            logger.warn(`抖店页面在等待主图文件输入框时超时: ${mainImageInputSelector}`);
        }

        const inputLocator = page.locator(mainImageInputSelector);
        const initialInputCount = await inputLocator.count();
        logger.info(`抖店检测到主图区域文件输入框数量: ${initialInputCount}`);
        const safeStartIndex = Number.isFinite(preferredStartIndex) && preferredStartIndex >= 0
            ? preferredStartIndex
            : 2;
        const startIndex = initialInputCount > safeStartIndex
            ? safeStartIndex
            : 0;
        const usableInputCount = Math.max(0, initialInputCount - startIndex);
        const maxUploadCount = Math.min(requested, usableInputCount, 5);
        logger.info(`抖店上传索引策略: startIndex=${startIndex}, usableInputCount=${usableInputCount}, maxUploadCount=${maxUploadCount}`);

        const batchUploadResult = await this._uploadImagesByFirstInput(page, inputLocator, filePaths.slice(0, Math.min(requested, 5)));
        logger.info(`抖店上传流程结束: uploaded=${batchUploadResult.uploadedPaths.length}/${requested}`);
        return {
            requested,
            availableInputs: initialInputCount,
            startIndex: batchUploadResult.inputIndex,
            uploadedPaths: batchUploadResult.uploadedPaths
        };
    }

    async _uploadImagesByFirstInput(page, inputLocator, filePaths) {
        const candidateCount = await inputLocator.count();
        logger.info(`抖店开始尝试主图首个文件输入框批量上传: candidateCount=${candidateCount}, fileCount=${filePaths.length}`);

        if (candidateCount <= 0) {
            logger.warn('抖店未找到主图区域文件输入框');
            return {
                inputIndex: 0,
                uploadedPaths: []
            };
        }

        const locator = inputLocator.first();
        const inputIndex = 0;
        let snapshot = null;

        try {
            snapshot = await locator.evaluate((el) => ({
                className: el.className || '',
                id: el.id || '',
                name: el.getAttribute('name') || '',
                accept: el.getAttribute('accept') || '',
                multiple: !!el.multiple,
                disabled: !!el.disabled,
                existingFiles: Array.from(el.files || []).map((file) => file.name)
            }));
            logger.info(`抖店首个文件输入框快照: input[${inputIndex}]`, snapshot);
        } catch (error) {
            logger.warn(`抖店读取首个文件输入框快照失败: input[${inputIndex}], error=${error?.message || error}`);
            throw error;
        }

        if (snapshot?.disabled) {
            throw new Error('抖店首个文件输入框不可用（disabled）');
        }

        const beforeUploadedCount = await this._countUploadedImageCandidates(page);
        logger.info(`抖店准备使用首个文件输入框批量上传: input[${inputIndex}], beforePreviewCount=${beforeUploadedCount}, files=${filePaths.map((item) => toUserFriendlyPath(item))}`);
        await locator.setInputFiles(filePaths);
        logger.info(`抖店首个文件输入框批量 setInputFiles 完成: input[${inputIndex}], count=${filePaths.length}`);

        const inputAccepted = await this._waitForInputReceiveFiles(locator, filePaths, inputIndex);
        const uploadConfirmed = await this._waitForBatchUploadConfirmation(page, beforeUploadedCount, filePaths, inputIndex);

        if (!inputAccepted && !uploadConfirmed) {
            throw new Error(`抖店首个文件输入框批量上传未确认成功: input[${inputIndex}]`);
        }

        await page.waitForTimeout(3000);
        return {
            inputIndex,
            uploadedPaths: [...filePaths]
        };
    }

    async _waitForInputReceiveFile(locator, targetFile, imageIndex, inputIndex) {
        const fileName = getPathFileName(targetFile);
        logger.info(`抖店等待 input[${inputIndex}] 接收文件: imageIndex=${imageIndex}, fileName=${fileName}`);

        try {
            await locator.waitFor({ state: 'attached', timeout: 5000 });
            await locator.evaluate((el, expectedFileName) => {
                return new Promise((resolve, reject) => {
                    const startedAt = Date.now();
                    const check = () => {
                        const files = el.files;
                        const matched = files && files.length > 0 && (!expectedFileName || files[0]?.name === expectedFileName);
                        if (matched) {
                            resolve(true);
                            return;
                        }
                        if (Date.now() - startedAt > 8000) {
                            reject(new Error('文件未进入 input'));
                            return;
                        }
                        setTimeout(check, 150);
                    };
                    check();
                });
            }, fileName);
            logger.info(`抖店检测到 input[${inputIndex}] 已接收文件: imageIndex=${imageIndex}, fileName=${fileName}`);
            return true;
        } catch (error) {
            logger.warn(`抖店第 ${imageIndex} 张图片写入 input[${inputIndex}] 后未检测到文件状态: ${error?.message || error}`);
            return false;
        }
    }

    async _waitForInputReceiveFiles(locator, targetFiles, inputIndex) {
        const expectedNames = targetFiles.map((item) => getPathFileName(item)).filter(Boolean);
        logger.info(`抖店等待单输入框接收多文件: input[${inputIndex}], expectedCount=${expectedNames.length}, files=${expectedNames}`);

        try {
            await locator.waitFor({ state: 'attached', timeout: 5000 });
            await locator.evaluate((el, expected) => {
                return new Promise((resolve, reject) => {
                    const startedAt = Date.now();
                    const check = () => {
                        const names = Array.from(el.files || []).map((file) => file.name);
                        const matched = expected.length > 0
                            && names.length === expected.length
                            && expected.every((name, index) => names[index] === name);
                        if (matched) {
                            resolve(true);
                            return;
                        }
                        if (Date.now() - startedAt > 8000) {
                            reject(new Error(`文件未完整进入 input, current=${names.join(', ')}`));
                            return;
                        }
                        setTimeout(check, 150);
                    };
                    check();
                });
            }, expectedNames);
            logger.info(`抖店单输入框已接收多文件: input[${inputIndex}], files=${expectedNames}`);
            return true;
        } catch (error) {
            logger.warn(`抖店单输入框接收多文件未确认: input[${inputIndex}], error=${error?.message || error}`);
            return false;
        }
    }

    async _countUploadedImageCandidates(page) {
        try {
            return await page.evaluate(() => {
                const selectors = [
                    '[class*="upload"] img',
                    '[class*="Upload"] img',
                    '[class*="image"] img',
                    '[class*="Image"] img',
                    '[class*="picture"] img',
                    '[class*="Picture"] img',
                    '.arco-upload-list img',
                    '.semi-upload-list img',
                    '.ant-upload-list img',
                    'img[src^="blob:"]',
                    'img[src^="data:image/"]'
                ];

                const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
                const uniqueKeys = new Set();

                nodes.forEach((node) => {
                    if (!(node instanceof HTMLImageElement)) {
                        return;
                    }
                    const src = node.currentSrc || node.src || '';
                    const width = node.naturalWidth || node.width || 0;
                    const height = node.naturalHeight || node.height || 0;
                    if (!src) {
                        return;
                    }
                    if (width > 32 || height > 32 || /^blob:|^data:image\//.test(src)) {
                        uniqueKeys.add(`${src}|${width}|${height}`);
                    }
                });

                return uniqueKeys.size;
            });
        } catch (error) {
            logger.warn(`抖店统计已上传图片候选失败: ${error?.message || error}`);
            return 0;
        }
    }

    async _waitForUploadConfirmation(page, beforeCount, imageIndex, inputIndex, fileName) {
        try {
            logger.info(`抖店等待页面上传确认: imageIndex=${imageIndex}, input[${inputIndex}], file=${fileName}, beforePreviewCount=${beforeCount}`);
            await page.waitForFunction((previousCount) => {
                const selectors = [
                    '[class*="upload"] img',
                    '[class*="Upload"] img',
                    '[class*="image"] img',
                    '[class*="Image"] img',
                    '[class*="picture"] img',
                    '[class*="Picture"] img',
                    '.arco-upload-list img',
                    '.semi-upload-list img',
                    '.ant-upload-list img',
                    'img[src^="blob:"]',
                    'img[src^="data:image/"]'
                ];

                const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
                const uniqueKeys = new Set();

                nodes.forEach((node) => {
                    if (!(node instanceof HTMLImageElement)) {
                        return;
                    }
                    const src = node.currentSrc || node.src || '';
                    const width = node.naturalWidth || node.width || 0;
                    const height = node.naturalHeight || node.height || 0;
                    if (!src) {
                        return;
                    }
                    if (width > 32 || height > 32 || /^blob:|^data:image\//.test(src)) {
                        uniqueKeys.add(`${src}|${width}|${height}`);
                    }
                });

                return uniqueKeys.size > previousCount;
            }, beforeCount, { timeout: 12000 });

            const afterCount = await this._countUploadedImageCandidates(page);
            logger.info(`抖店检测到页面上传预览数量增长: imageIndex=${imageIndex}, input[${inputIndex}], file=${fileName}, before=${beforeCount}, after=${afterCount}`);
            return true;
        } catch (error) {
            logger.warn(`抖店等待页面上传确认超时: imageIndex=${imageIndex}, input[${inputIndex}], file=${fileName}, beforePreviewCount=${beforeCount}, error=${error?.message || error}`);
            return false;
        }
    }

    async _waitForBatchUploadConfirmation(page, beforeCount, targetFiles, inputIndex) {
        const expectedIncrease = targetFiles.length;
        const fileNames = targetFiles.map((item) => getPathFileName(item));
        logger.info(`抖店等待单输入框批量上传确认: input[${inputIndex}], beforePreviewCount=${beforeCount}, expectedIncrease=${expectedIncrease}, files=${fileNames}`);

        try {
            await page.waitForFunction((payload) => {
                const selectors = [
                    '[class*="upload"] img',
                    '[class*="Upload"] img',
                    '[class*="image"] img',
                    '[class*="Image"] img',
                    '[class*="picture"] img',
                    '[class*="Picture"] img',
                    '.arco-upload-list img',
                    '.semi-upload-list img',
                    '.ant-upload-list img',
                    'img[src^="blob:"]',
                    'img[src^="data:image/"]'
                ];

                const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
                const uniqueKeys = new Set();

                nodes.forEach((node) => {
                    if (!(node instanceof HTMLImageElement)) {
                        return;
                    }
                    const src = node.currentSrc || node.src || '';
                    const width = node.naturalWidth || node.width || 0;
                    const height = node.naturalHeight || node.height || 0;
                    if (!src) {
                        return;
                    }
                    if (width > 32 || height > 32 || /^blob:|^data:image\//.test(src)) {
                        uniqueKeys.add(`${src}|${width}|${height}`);
                    }
                });

                return uniqueKeys.size >= payload.beforeCount + payload.expectedIncrease;
            }, {
                beforeCount,
                expectedIncrease
            }, { timeout: 15000 });

            const afterCount = await this._countUploadedImageCandidates(page);
            logger.info(`抖店单输入框批量上传预览确认成功: input[${inputIndex}], before=${beforeCount}, after=${afterCount}, files=${fileNames}`);
            return true;
        } catch (error) {
            logger.warn(`抖店单输入框批量上传预览确认超时: input[${inputIndex}], before=${beforeCount}, expectedIncrease=${expectedIncrease}, error=${error?.message || error}`);
            return false;
        }
    }

    async _fillTitle(page, title) {
        const finalTitle = normalizeDoudianTitle(title);
        if (!finalTitle) {
            logger.info('抖店标题为空，跳过填写');
            return false;
        }

        logger.info(`抖店准备填写标题: ${finalTitle}`);

        const titleFilled = await this._fillDoudianTitleInput(page, finalTitle);
        if (!titleFilled) {
            logger.warn('抖店未找到标题输入框: #pg-title-input');
            return false;
        }

        try {
            await page.waitForFunction((selector, expectedValue) => {
                const input = document.querySelector(selector);
                if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
                    return false;
                }
                return String(input.value || '').trim() === expectedValue;
            }, '#pg-title-input', finalTitle, { timeout: 5000 });
        } catch (error) {
            logger.warn(`抖店标题回读校验未通过: ${error?.message || error}`);
        }

        logger.info(`抖店标题填写完成: ${finalTitle}`);
        return true;
    }

    async _hoverMaterialButtonGuider(page) {
        const selector = '#material-button-guider';
        try {
            await page.waitForSelector(selector, { timeout: 10000, state: 'visible' });
            // 商品主图逻辑：先把主图引导按钮滚进可视区域，再执行 hover，确保后续操作按钮能稳定出现。
            await page.locator(selector).scrollIntoViewIfNeeded();
            logger.info(`抖店商品主图逻辑：已将元素滚动到可视区域: ${selector}`);
            await page.waitForTimeout(300);
            await page.hover(selector);
            logger.info(`抖店商品主图逻辑：已执行悬停步骤: ${selector}`);
            await page.waitForTimeout(500);
            await this._clickMaterialActionAfter(page);
        } catch (error) {
            logger.warn(`抖店商品主图逻辑：悬停 ${selector} 失败: ${error?.message || error}`);
        }
    }

    async _clickMaterialActionAfter(page) {
        const selector = '[attr-field-id="主图"] [class*="hoverBottomWrapper"] [class*=index-module_actionAfter]';
        const targetIndex = 1;
        try {
            await page.waitForSelector(selector, { timeout: 10000, state: 'visible' });
            // 商品主图逻辑：点击主图区域 hover 后展开的第二个操作按钮。
            const clicked = await page.evaluate(({ targetSelector, index }) => {
                const target = document.querySelectorAll(targetSelector)?.[index];
                if (!(target instanceof HTMLElement)) {
                    return false;
                }
                target.click();
                return true;
            }, { targetSelector: selector, index: targetIndex });

            if (!clicked) {
                throw new Error(`未找到第 ${targetIndex + 1} 个匹配元素`);
            }

            logger.info(`抖店商品主图逻辑：已点击元素 document.querySelectorAll('${selector}')[${targetIndex}]`);
            await page.waitForTimeout(500);
        } catch (error) {
            logger.warn(`抖店商品主图逻辑：点击 document.querySelectorAll('${selector}')[${targetIndex}] 失败: ${error?.message || error}`);
        }
    }

    async _checkLogin(page) {
        const userSelectors = ['.header-user-info', '.account-info', '.user-info', '.avatar', '[class*="merchant"]'];
        for (const selector of userSelectors) {
            try {
                if (await page.locator(selector).first().count()) {
                    return true;
                }
            } catch {
                // ignore
            }
        }

        const loginSelectors = ['.login-btn', '.login-button', '.auth-btn', 'text=登录', 'text=扫码登录'];
        for (const selector of loginSelectors) {
            try {
                if (await page.locator(selector).first().count()) {
                    return false;
                }
            } catch {
                // ignore
            }
        }

        return !/login|signin|passport/i.test(page.url());
    }

    async _prepareImages(images) {
        const filePaths = [];
        const tempFiles = [];

        for (let i = 0; i < images.length; i += 1) {
            const source = String(images[i] || '').trim();
            if (!source) continue;

            if (/^https?:\/\//i.test(source)) {
                const tempPath = await this.imageManager.downloadImage(source, `${this.platformKey}_${Date.now()}_${i}`);
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

    async _fillDoudianTitleInput(page, value) {
        const selector = '#pg-title-input';

        try {
            await page.waitForSelector(selector, { timeout: 10000, state: 'visible' });
        } catch {
            return false;
        }

        const input = page.locator(selector).first();
        try {
            await input.scrollIntoViewIfNeeded().catch(() => undefined);
            await input.click({ clickCount: 3 }).catch(() => undefined);
            await input.fill('').catch(() => undefined);
            await input.fill(value);
            return true;
        } catch {
            try {
                await input.click({ clickCount: 3 }).catch(() => undefined);
                await page.keyboard.press('Control+A').catch(() => undefined);
                await page.keyboard.press('Meta+A').catch(() => undefined);
                await page.keyboard.press('Backspace').catch(() => undefined);
                await page.keyboard.type(value, { delay: 20 });
                return true;
            } catch {
                return false;
            }
        }
    }
}

export const doudianPublisher = new DoudianPublisher();

export async function publishToDoudian(publishInfo) {
    return await doudianPublisher.publish(publishInfo);
}

export default doudianPublisher;
