/**
 * 小红书发布功能 - 独立实现
 */

import { getOrCreateBrowser } from '../services/BrowserService.js';
import { ImageManager } from '../services/ImageManager.js';
import { PageOperator } from '../services/PageOperator.js';
import { XiaohongshuLoginChecker } from '../services/LoginChecker.js';
import { PLATFORM_CONFIGS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';

/**
 * 小红书发布器类
 */
class XiaohongshuPublisher {
    constructor() {
        this.platformName = '小红书';
        this.config = PLATFORM_CONFIGS.xiaohongshu;
        this.imageManager = new ImageManager();
        this.pageOperator = new PageOperator();
        this.loginChecker = new XiaohongshuLoginChecker();
    }

    /**
     * 发布到小红书
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
     * 处理图片上传
     */
    async handleImageUpload(page, images) {
        logger.info(`开始上传 ${images.length} 张图片...`);
        
        for (let i = 0; i < images.length; i++) {
            const imageUrl = images[i];
            try {
                logger.info(`正在上传第 ${i + 1}/${images.length} 张图片: ${imageUrl}`);
                
                // 下载图片到临时目录
                const tempPath = await this.imageManager.downloadImage(imageUrl, `${this.platformName}_${Date.now()}_${i}`);
                
                // 上传图片
                await this.uploadSingleImage(page, tempPath, i);
                
                // 删除临时文件
                this.imageManager.deleteTempFile(tempPath);
                
                // 图片间间隔
                if (i < images.length - 1) {
                    await this.pageOperator.delay(1000);
                }
                
            } catch (error) {
                logger.error(`处理图片 ${imageUrl} 时出错:`, error);
                throw error;
            }
        }
        
        logger.info(`所有图片上传完成，共 ${images.length} 张`);
    }

    /**
     * 上传单张图片
     */
    async uploadSingleImage(page, tempPath, imageIndex) {
        const fileInput = await page.$('input[type="file"]');
        if (!fileInput) {
            throw new Error('未找到文件选择器');
        }
        
        await fileInput.uploadFile(tempPath);
        logger.info(`已上传图片 ${imageIndex + 1}`);
        
        // 等待图片上传完成
        await this.waitForImageUploadComplete(page, imageIndex);
    }

    /**
     * 等待图片上传完成
     */
    async waitForImageUploadComplete(page, imageIndex) {
        await this.pageOperator.delay(2000);
    }

    /**
     * 填写内容
     */
    async fillContent(page, publishInfo) {
        // 填写标题
        if (publishInfo.title) {
            await this.pageOperator.fillInput(page, this.config.selectors.titleInput, publishInfo.title, {
                delay: 100
            });
            logger.info('已填写标题');
        }

        // 填写正文内容
        if (publishInfo.content) {
            await this.pageOperator.fillInput(page, this.config.selectors.contentInput, publishInfo.content, {
                delay: 50
            });
            logger.info('已填写正文内容');
        }

        // 等待内容填写完成
        await this.pageOperator.delay(2000);
    }

    /**
     * 点击发布按钮
     */
    async clickPublishButton(page) {
        const submitButton = await page.waitForSelector(this.config.selectors.submitButton);
        if (!submitButton) {
            throw new Error('未找到发布按钮');
        }

        // 模拟真实用户点击行为
        await submitButton.hover();
        await this.pageOperator.delay(500);
        await submitButton.click();
        logger.info('已点击发布按钮');
    }

    /**
     * 等待发布完成
     */
    async waitForPublishComplete(page) {
        await this.pageOperator.delay(5000);
    }

    /**
     * 检查登录状态
     */
    async checkLoginStatus(page) {
        return await this.loginChecker.checkLoginStatus(page);
    }
}

// 创建单例实例
const xiaohongshuPublisher = new XiaohongshuPublisher();

/**
 * 发布到小红书
 */
export async function publishToXiaohongshu(publishInfo) {
    return await xiaohongshuPublisher.publish(publishInfo);
}

/**
 * 专门检测小红书登录状态的方法（保持向后兼容）
 */
export async function checkXiaohongshuLoginStatus(page) {
    const xiaohongshuChecker = new XiaohongshuLoginChecker();
    return await xiaohongshuChecker.checkLoginStatus(page);
}