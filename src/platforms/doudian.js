import { BasicShopPublisher } from './basicShopPublisher.js';
import { getOrCreateBrowser } from '../services/BrowserService.js';
import { logger } from '../utils/logger.js';
import path from 'path';

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

class DoudianPublisher extends BasicShopPublisher {
    constructor() {
        super({
            platformKey: 'doudian',
            platformName: '抖店',
            uploadUrl: 'https://fxg.jinritemai.com/ffa/g/create',
            selectors: {
                titleInput: [
                    'input[placeholder*="商品标题"]',
                    'input[placeholder*="标题"]',
                    'input[placeholder*="商品名称"]',
                    'input[name*="title"]'
                ],
                contentInput: [
                    'textarea[placeholder*="商品描述"]',
                    'textarea[placeholder*="描述"]',
                    'textarea',
                    '[contenteditable="true"]'
                ],
                fileInput: 'input[type="file"]',
                priceInput: [
                    'input[placeholder*="价格"]',
                    'input[placeholder*="售价"]',
                    'input[name*="price"]'
                ],
                draftButton: [
                    'button:has-text("保存草稿")',
                    'button:has-text("暂存")',
                    'button:has-text("保存")'
                ],
                submitButton: [
                    'button:has-text("发布商品")',
                    'button:has-text("提交审核")',
                    'button:has-text("发布")'
                ],
                userElements: ['.header-user-info', '.account-info', '.user-info', '.avatar', '[class*="merchant"]'],
                loginElements: ['.login-btn', '.login-button', '.auth-btn', 'text=登录', 'text=扫码登录']
            }
        });
    }

    async publish(publishInfo = {}) {
        let page = null;
        const tempFiles = [];

        try {
            const settings = publishInfo.platformOptions || publishInfo.publishOptions || publishInfo.platformSettings?.[this.platformKey] || {};
            const images = Array.isArray(publishInfo.images) ? publishInfo.images.filter(Boolean) : [];
            const targetImages = images.slice(0, 5);

            logger.info('开始执行抖店商品图片上传流程');
            logger.info('抖店发布入参摘要:', {
                imageCount: targetImages.length,
                title: publishInfo.title || '',
                fileInputStartIndex: Number(settings.fileInputStartIndex ?? publishInfo.fileInputStartIndex ?? 2)
            });

            if (targetImages.length === 0) {
                return {
                    success: false,
                    message: '抖店图片上传失败：未提供可用图片',
                    data: {
                        uploaded: 0,
                        requested: 0
                    }
                };
            }

            const browser = await getOrCreateBrowser();
            logger.info('抖店已获取浏览器实例，准备创建新页面');
            page = await browser.newPage();
            logger.info('抖店新页面创建成功');
            await this.pageOperator.setupAntiDetection(page);
            logger.info('抖店页面反检测设置完成');

            logger.info(`抖店准备打开商品发布页: ${this.uploadUrl}`);
            await page.goto(this.uploadUrl, {
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
            const preparedImages = await this._prepareImages(targetImages);
            tempFiles.push(...preparedImages.tempFiles);
            logger.info(`抖店准备上传的图片数量: ${preparedImages.filePaths.length}`);
            logger.info('抖店准备上传的图片路径:', preparedImages.filePaths.map((item) => toUserFriendlyPath(item)));
            logger.info('抖店图片预处理结果:', {
                tempFileCount: preparedImages.tempFiles.length,
                fileNames: preparedImages.filePaths.map((item) => getPathFileName(item))
            });

            if (preparedImages.filePaths.length === 0) {
                return {
                    success: false,
                    message: '抖店图片上传失败：图片路径不可用',
                    data: {
                        uploaded: 0,
                        requested: targetImages.length
                    }
                };
            }

            const uploadResult = await this._uploadImagesToSeparateInputs(
                page,
                preparedImages.filePaths.slice(0, 5),
                Number(settings.fileInputStartIndex ?? publishInfo.fileInputStartIndex ?? 2)
            );
            const uploaded = uploadResult.uploadedPaths.length;

            return {
                success: uploaded > 0,
                message: uploaded > 0
                    ? `抖店商品图片已上传 ${uploaded}/${uploadResult.requested} 张`
                    : '抖店商品图片上传失败：未找到可用的文件输入框',
                data: {
                    uploaded,
                    requested: uploadResult.requested,
                    availableInputs: uploadResult.availableInputs,
                    startIndex: uploadResult.startIndex,
                    uploadedPaths: uploadResult.uploadedPaths.map((item) => toUserFriendlyPath(item)),
                    uploadedNames: uploadResult.uploadedPaths.map((item) => getPathFileName(item)),
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
        logger.info('抖店页面已完成基础加载，准备扫描文件输入框');

        try {
            await page.waitForSelector(this.selectors.fileInput, {
                timeout: 15000,
                state: 'attached'
            });
            logger.info(`抖店已检测到文件输入框选择器: ${this.selectors.fileInput}`);
        } catch {
            logger.warn('抖店页面在等待 input[type="file"] 时超时');
        }

        const inputLocator = page.locator(this.selectors.fileInput);
        const initialInputCount = await inputLocator.count();
        logger.info(`抖店检测到初始 input[type="file"] 数量: ${initialInputCount}`);
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
        logger.info(`抖店开始尝试首个文件输入框批量上传: candidateCount=${candidateCount}, fileCount=${filePaths.length}`);

        if (candidateCount <= 0) {
            logger.warn('抖店未找到任何文件输入框');
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
}

export const doudianPublisher = new DoudianPublisher();

export async function publishToDoudian(publishInfo) {
    return await doudianPublisher.publish(publishInfo);
}

export default doudianPublisher;
