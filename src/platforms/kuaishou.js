/**
 * 快手发布功能 - 独立实现
 */

import { getOrCreateBrowser } from '../services/BrowserService.js';
import { ImageManager } from '../services/ImageManager.js';
import { PageOperator } from '../services/PageOperator.js';
import { GenericLoginChecker } from '../services/LoginChecker.js';
import { PLATFORM_CONFIGS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';

/**
 * 快手发布器类
 */
class KuaishouPublisher {
    constructor() {
        this.platformName = '快手';
        this.config = PLATFORM_CONFIGS.kuaishou;
        this.imageManager = new ImageManager();
        this.pageOperator = new PageOperator();
        this.loginChecker = new GenericLoginChecker('快手', {
            selectors: PLATFORM_CONFIGS.kuaishou.loginSelectors
        });
    }

    /**
     * 发布到快手
     */
    async publish(publishInfo) {
        let page = null;
        try {
            logger.info(`开始执行${this.platformName}发布操作，参数:`, publishInfo);
            
            // 1. 获取浏览器和页面
            const browser = await getOrCreateBrowser();
            page = await browser.newPage();
            logger.info('新页面创建成功');

            // 2. 应用反检测（如果需要）
            if (this.config.antiDetection) {
                await this.pageOperator.setupAntiDetection(page);
                logger.info('反检测脚本已应用');
            }

            // 3. 导航到发布页面
            await page.goto(this.config.uploadUrl, {
                waitUntil: this.config.waitUntil || 'domcontentloaded',
                timeout: this.config.timeout || 30000
            });
            logger.info(`已打开${this.platformName}发布页面`);

            // 4. 检查登录状态
            if (this.config.checkLogin) {
                const loginResult = await this.checkLoginStatus(page);
                if (!loginResult.isLoggedIn) {
                    return {
                        success: false,
                        message: `${this.platformName}未登录: ${loginResult.details?.reason || '未知原因'}`,
                        data: { loginStatus: loginResult }
                    };
                }
                logger.info(`${this.platformName}已登录，继续发布流程`);
            }

            // 5. 执行平台特定的预处理
            if (this.config.preProcess) {
                await this.config.preProcess(page);
            }

            // 6. 处理图片上传
            if (publishInfo.images && publishInfo.images.length > 0) {
                await this.handleImageUpload(page, publishInfo.images);
            }

            // 7. 填写内容
            await this.fillContent(page, publishInfo);

            // 8. 执行平台特定的后处理
            if (this.config.postProcess) {
                await this.config.postProcess(page);
            }

            // 9. 点击发布按钮
            await this.clickPublishButton(page);

            // 10. 等待发布完成
            await this.waitForPublishComplete(page);

            return { success: true, message: `${this.platformName}发布成功` };

        } catch (error) {
            logger.error(`${this.platformName}发布过程出错:`, error);
            return {
                success: false,
                message: error?.message || '未知错误',
                data: error
            };
        } finally {
            if (page) {
                try {
                    await page.close();
                    logger.info(`${this.platformName}页面已关闭`);
                } catch (closeError) {
                    logger.warn(`${this.platformName}关闭页面时出错:`, closeError);
                }
            }
        }
    }

    /**
     * 处理图片上传 - 快手特殊处理
     */
    async handleImageUpload(page, images) {
        logger.info(`开始上传 ${images.length} 张图片...`);
        
        if (images.length === 0) return;
        
        // 下载所有图片到本地
        const tempPaths = [];
        for (const imageUrl of images) {
            try {
                const tempPath = await this.imageManager.downloadImage(imageUrl, `kuaishou_${Date.now()}`);
                tempPaths.push(tempPath);
            } catch (error) {
                logger.error(`处理图片 ${imageUrl} 时出错:`, error);
                throw error;
            }
        }

        // 等待页面 loading 结束，上传按钮出现
        logger.info('等待页面 loading 结束...');
        await page.waitForFunction(() => {
            // 检查是否有 loading 元素
            const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], .loading, .Loading');
            const hasLoading = Array.from(loadingElements).some(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            });
            
            // 检查上传按钮是否已出现
            const uploadButtons = document.querySelectorAll('button[class^="_upload-btn_"]');
            const hasUploadButton = uploadButtons.length > 0;
            
            return !hasLoading && hasUploadButton;
        }, { timeout: 30000 });
        
        logger.info('页面 loading 已结束，上传按钮已出现');
        
        // 一次性上传所有图片
        const uploadButtons = await page.$$('button[class^="_upload-btn_"]');
        const uploadButton = uploadButtons[1];
        if (!uploadButton) {
            throw new Error('未找到上传按钮');
        }
        
        logger.info('开始上传图片...');
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            uploadButton.click()
        ]);
        
        await fileChooser.accept(tempPaths);
        logger.info('已上传所有图片:', tempPaths);
        
        // 等待图片上传完成
        await this.pageOperator.delay(3000);
        
        // 删除临时文件
        this.imageManager.deleteTempFiles(tempPaths);
    }

    /**
     * 填写内容 - 快手使用富文本编辑器
     */
    async fillContent(page, publishInfo) {
        if (publishInfo.content) {
            await page.waitForSelector(this.config.selectors.contentInput);
            await page.evaluate((selector, content) => {
                const el = document.querySelector(selector);
                if (el) {
                    el.innerHTML = content;
                }
            }, this.config.selectors.contentInput, publishInfo.content);
            logger.info('已填写正文内容');
        }

        // 等待内容填写完成
        await this.pageOperator.delay(1000);
    }

    /**
     * 点击发布按钮
     */
    async clickPublishButton(page) {
        if (!this.config.selectors.submitButton) {
            throw new Error('未配置发布按钮选择器');
        }

        await page.waitForSelector(this.config.selectors.submitButton, { timeout: 10000 });
        
        // 检查按钮是否可用
        const isButtonEnabled = await this.pageOperator.isButtonEnabled(page, this.config.selectors.submitButton);
        if (!isButtonEnabled) {
            logger.info('发布按钮不可用，等待...');
            await this.pageOperator.waitForButtonEnabled(page, this.config.selectors.submitButton);
        }
        
        await page.click(this.config.selectors.submitButton);
        logger.info('已点击发布按钮');
    }

    /**
     * 等待发布完成
     */
    async waitForPublishComplete(page) {
        await this.pageOperator.delay(3000);
    }

    /**
     * 检查登录状态
     */
    async checkLoginStatus(page) {
        return await this.loginChecker.checkLoginStatus(page);
    }
}

// 创建单例实例
const kuaishouPublisher = new KuaishouPublisher();

/**
 * 发布到快手
 */
export async function publishToKuaishou(publishInfo) {
    return await kuaishouPublisher.publish(publishInfo);
}
