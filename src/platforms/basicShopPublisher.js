import fs from 'fs';
import { getOrCreateBrowser } from '../services/BrowserService.js';
import { ImageManager } from '../services/ImageManager.js';
import { PageOperator } from '../services/PageOperator.js';
import { logger } from '../utils/logger.js';

export class BasicShopPublisher {
    constructor(config) {
        this.platformKey = config.platformKey;
        this.platformName = config.platformName;
        this.uploadUrl = config.uploadUrl;
        this.selectors = config.selectors;
        this.imageManager = new ImageManager();
        this.pageOperator = new PageOperator();
    }

    async publish(publishInfo = {}) {
        let page = null;
        const tempFiles = [];

        try {
            const settings = publishInfo.platformOptions || publishInfo.publishOptions || publishInfo.platformSettings?.[this.platformKey] || {};
            const draftOnly = settings.draftOnly !== false;
            const title = String(publishInfo.title || publishInfo.name || '').trim();
            const description = String(publishInfo.description || publishInfo.content || '').trim();
            const images = Array.isArray(publishInfo.images) ? publishInfo.images.filter(Boolean) : [];

            logger.info(`开始执行${this.platformName}基础发布流程`);

            const browser = await getOrCreateBrowser();
            page = await browser.newPage();
            await this.pageOperator.setupAntiDetection(page);

            await page.goto(this.uploadUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            await page.waitForTimeout(3000);

            const isLoggedIn = await this._checkLogin(page);
            if (!isLoggedIn) {
                return {
                    success: false,
                    message: `请先登录${this.platformName}商家后台`
                };
            }

            if (title) {
                const filled = await this._fillField(page, this.selectors.titleInput, title);
                if (filled) {
                    logger.info(`${this.platformName}标题已填充`);
                }
            }

            if (description) {
                const filled = await this._fillField(page, this.selectors.contentInput, description);
                if (filled) {
                    logger.info(`${this.platformName}描述已填充`);
                }
            }

            if (settings.price !== undefined && settings.price !== null && settings.price !== '') {
                const filled = await this._fillField(page, this.selectors.priceInput, String(settings.price));
                if (filled) {
                    logger.info(`${this.platformName}价格已填充`);
                }
            }

            if (images.length > 0) {
                const preparedImages = await this._prepareImages(images);
                tempFiles.push(...preparedImages.tempFiles);
                if (preparedImages.filePaths.length > 0) {
                    const uploaded = await this._uploadFiles(page, preparedImages.filePaths);
                    if (uploaded) {
                        logger.info(`${this.platformName}已上传 ${preparedImages.filePaths.length} 张图片`);
                    }
                }
            }

            const actionSelectors = draftOnly ? this.selectors.draftButton : this.selectors.submitButton;
            const clicked = await this._clickFirstButton(page, actionSelectors);

            if (!clicked) {
                return {
                    success: false,
                    message: `${this.platformName}基础支持已接入，但暂未识别到${draftOnly ? '草稿' : '发布'}按钮`
                };
            }

            await page.waitForTimeout(2500);

            return {
                success: true,
                message: draftOnly
                    ? `${this.platformName}基础草稿流程已执行完成`
                    : `${this.platformName}基础发布流程已执行完成`
            };
        } catch (error) {
            logger.error(`${this.platformName}发布失败:`, error);
            return {
                success: false,
                message: error?.message || `${this.platformName}发布失败`
            };
        } finally {
            tempFiles.forEach((file) => this.imageManager.deleteTempFile(file));
            if (page) {
                try {
                    await page.close();
                } catch (closeError) {
                    logger.warn(`${this.platformName}关闭页面失败:`, closeError);
                }
            }
        }
    }

    async _checkLogin(page) {
        const userSelectors = Array.isArray(this.selectors.userElements) ? this.selectors.userElements : [];
        const loginSelectors = Array.isArray(this.selectors.loginElements) ? this.selectors.loginElements : [];

        for (const selector of userSelectors) {
            try {
                const locator = page.locator(selector).first();
                if (await locator.count()) {
                    return true;
                }
            } catch {
                continue;
            }
        }

        for (const selector of loginSelectors) {
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

    async _fillField(page, selectors, value) {
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        for (const selector of selectorList) {
            if (!selector) continue;
            try {
                const locator = page.locator(selector).first();
                if (!(await locator.count())) continue;

                await locator.scrollIntoViewIfNeeded().catch(() => undefined);

                try {
                    await locator.fill('');
                    await locator.fill(value);
                } catch {
                    await locator.click({ clickCount: 3 }).catch(() => undefined);
                    await page.keyboard.press('Control+A').catch(() => undefined);
                    await page.keyboard.press('Backspace').catch(() => undefined);
                    await page.keyboard.type(value, { delay: 20 });
                }

                return true;
            } catch {
                continue;
            }
        }
        return false;
    }

    async _prepareImages(images) {
        const filePaths = [];
        const tempFiles = [];

        for (let i = 0; i < images.length; i++) {
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

    async _uploadFiles(page, filePaths) {
        if (!filePaths.length || !this.selectors.fileInput) return false;

        const locator = page.locator(this.selectors.fileInput).first();
        if (!(await locator.count())) {
            return false;
        }

        await locator.setInputFiles(filePaths);
        await page.waitForTimeout(3000);
        return true;
    }

    async _clickFirstButton(page, selectors) {
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        for (const selector of selectorList) {
            if (!selector) continue;
            try {
                const locator = page.locator(selector).first();
                if (!(await locator.count())) continue;
                await locator.scrollIntoViewIfNeeded().catch(() => undefined);
                await locator.click({ delay: 100 });
                return true;
            } catch {
                continue;
            }
        }
        return false;
    }
}
