import { BasicShopPublisher } from './basicShopPublisher.js';
import { getOrCreateBrowser } from '../services/BrowserService.js';
import { logger } from '../utils/logger.js';

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
            page = await browser.newPage();
            await this.pageOperator.setupAntiDetection(page);

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

            const preparedImages = await this._prepareImages(targetImages);
            tempFiles.push(...preparedImages.tempFiles);
            logger.info(`抖店准备上传的图片数量: ${preparedImages.filePaths.length}`);
            logger.info('抖店准备上传的图片路径:', preparedImages.filePaths);

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
                    uploadedPaths: uploadResult.uploadedPaths,
                    uploadedNames: uploadResult.uploadedPaths.map((item) => item.split('/').pop()),
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

        try {
            await page.waitForSelector(this.selectors.fileInput, {
                timeout: 15000,
                state: 'attached'
            });
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
        const uploadedPaths = [];
        logger.info(`抖店上传索引策略: startIndex=${startIndex}, usableInputCount=${usableInputCount}, maxUploadCount=${maxUploadCount}`);

        for (let index = 0; index < maxUploadCount; index += 1) {
            const targetFile = filePaths[index];
            const currentInputCount = await inputLocator.count();
            const targetInputIndex = startIndex + index;
            const targetFileName = String(targetFile).split('/').pop() || targetFile;

            logger.info(`抖店上传循环开始: imageIndex=${index + 1}, targetInputIndex=${targetInputIndex}, currentInputCount=${currentInputCount}, file=${targetFileName}`);
            if (currentInputCount <= targetInputIndex) {
                logger.warn(`抖店当前 input[type="file"] 数量不足，停止上传。current=${currentInputCount}, targetIndex=${targetInputIndex}`);
                break;
            }

            const locator = inputLocator.nth(targetInputIndex);

            try {
                const inputSnapshot = await locator.evaluate((el, fileIndex) => ({
                    fileIndex,
                    className: el.className || '',
                    id: el.id || '',
                    name: el.getAttribute('name') || '',
                    accept: el.getAttribute('accept') || '',
                    multiple: !!el.multiple,
                    disabled: !!el.disabled,
                    existingFiles: Array.from(el.files || []).map((file) => file.name)
                }), index + 1);
                logger.info(`抖店目标 input 快照:`, inputSnapshot);
            } catch (error) {
                logger.warn(`抖店读取目标 input 快照失败: ${error?.message || error}`);
            }

            logger.info(`抖店准备上传第 ${index + 1} 张图片，当前 input 总数: ${currentInputCount}，目标索引: ${targetInputIndex}`);
            await locator.setInputFiles([targetFile]);
            await this._waitForInputReceiveFile(locator, targetFile, index + 1, targetInputIndex);
            uploadedPaths.push(targetFile);
            logger.info(`抖店第 ${index + 1} 张图片已写入 input[${targetInputIndex}]，等待页面处理完成`);
            await page.waitForTimeout(2500);

            try {
                const afterSnapshot = await locator.evaluate((el, fileIndex) => ({
                    fileIndex,
                    existingFiles: Array.from(el.files || []).map((file) => file.name)
                }), index + 1);
                logger.info(`抖店写入后 input 快照:`, afterSnapshot);
            } catch (error) {
                logger.warn(`抖店读取写入后 input 快照失败: ${error?.message || error}`);
            }
        }

        await page.waitForTimeout(3000);
        logger.info(`抖店上传流程结束: uploaded=${uploadedPaths.length}/${requested}`);

        return {
            requested,
            availableInputs: initialInputCount,
            startIndex,
            uploadedPaths
        };
    }

    async _waitForInputReceiveFile(locator, targetFile, imageIndex, inputIndex) {
        const fileName = String(targetFile).split('/').pop() || '';
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
        } catch (error) {
            logger.warn(`抖店第 ${imageIndex} 张图片写入 input[${inputIndex}] 后未检测到文件状态: ${error?.message || error}`);
        }
    }
}

export const doudianPublisher = new DoudianPublisher();

export async function publishToDoudian(publishInfo) {
    return await doudianPublisher.publish(publishInfo);
}

export default doudianPublisher;
