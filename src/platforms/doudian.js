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

        for (let index = 0; index < maxUploadCount; index += 1) {
            const targetFile = filePaths[index];
            const currentInputCount = await inputLocator.count();
            if (currentInputCount <= startIndex) {
                logger.warn(`抖店当前剩余 input[type="file"] 数量不足，停止上传。current=${currentInputCount}, startIndex=${startIndex}`);
                break;
            }

            const locator = inputLocator.nth(startIndex);

            logger.info(`抖店准备上传第 ${index + 1} 张图片，当前 input 总数: ${currentInputCount}，目标固定索引: ${startIndex}`);
            await locator.setInputFiles([targetFile]);
            uploadedPaths.push(targetFile);
            logger.info(`抖店第 ${index + 1} 张图片已写入当前 input[${startIndex}]`);
            await page.waitForTimeout(1500);
        }

        await page.waitForTimeout(3000);

        return {
            requested,
            availableInputs: initialInputCount,
            startIndex,
            uploadedPaths
        };
    }
}

export const doudianPublisher = new DoudianPublisher();

export async function publishToDoudian(publishInfo) {
    return await doudianPublisher.publish(publishInfo);
}

export default doudianPublisher;
