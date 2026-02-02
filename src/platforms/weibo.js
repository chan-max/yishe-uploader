/**
 * 微博发布功能 - 独立实现
 */

import {
    getOrCreateBrowser
} from '../services/BrowserService.js';
import {
    ImageManager
} from '../services/ImageManager.js';
import {
    PageOperator
} from '../services/PageOperator.js';
import {
    GenericLoginChecker
} from '../services/LoginChecker.js';
import {
    PLATFORM_CONFIGS
} from '../config/platforms.js';
import {
    logger
} from '../utils/logger.js';
import {
    weiboAuth
} from '../utils/weiboAuth.js';

/**
 * 微博发布器类
 */
class WeiboPublisher {
    constructor() {
        this.platformName = '微博';
        this.config = PLATFORM_CONFIGS.weibo;
        this.imageManager = new ImageManager();
        this.pageOperator = new PageOperator();
        this.loginChecker = new GenericLoginChecker('微博', {
            selectors: PLATFORM_CONFIGS.weibo.loginSelectors
        });
    }

    /**
     * 发布到微博
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

            // 2.5. 应用微博认证
            await weiboAuth.applyAuth(page);

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
                        data: {
                            loginStatus: loginResult
                        }
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

            return {
                success: true,
                message: `${this.platformName}发布成功`
            };

        } catch (error) {
            logger.error(`${this.platformName}发布过程出错:`, error);
            return {
                success: false,
                message: error ? error.message : '未知错误',
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

        // Playwright: setInputFiles 替代 Puppeteer 的 uploadFile
        await fileInput.setInputFiles(tempPath);
        logger.info(`已上传图片 ${imageIndex + 1}`);

        // 等待图片上传完成
        await this.waitForImageUploadComplete(page, imageIndex);
    }

    /**
     * 等待图片上传完成 - 微博特殊处理
     */
    async waitForImageUploadComplete(page, imageIndex) {
        const maxWaitTime = 30000; // 最大等待30秒
        const checkInterval = 1000; // 每秒检查一次
        let elapsedTime = 0;

        logger.info(`等待第 ${imageIndex + 1} 张图片上传完成...`);

        while (elapsedTime < maxWaitTime) {
            try {
                // 检查是否有 Image_loading_ 开头的class元素（表示正在上传）
                const hasLoadingElement = await page.evaluate(() => {
                    const loadingElements = document.querySelectorAll('[class*="Image_loading_"]');
                    return loadingElements.length > 0;
                });

                if (!hasLoadingElement) {
                    logger.info(`第 ${imageIndex + 1} 张图片上传完成（无loading元素）`);
                    return;
                }

                logger.info(`第 ${imageIndex + 1} 张图片仍在上传中...`);

            } catch (error) {
                logger.warn(`检查图片 ${imageIndex + 1} 上传状态时出错:`, error);
            }

            await this.pageOperator.delay(checkInterval);
            elapsedTime += checkInterval;
        }

        logger.warn(`第 ${imageIndex + 1} 张图片上传等待超时`);
    }

    /**
     * 填写内容
     */
    async fillContent(page, publishInfo) {
        // 填写标题
        if (this.config.selectors.titleInput && publishInfo.title) {
            await this.pageOperator.fillInput(page, this.config.selectors.titleInput, publishInfo.title);
            logger.info('已填写标题');
        }

        // 填写正文内容
        if (this.config.selectors.contentInput && publishInfo.content) {
            await this.pageOperator.fillInput(page, this.config.selectors.contentInput, publishInfo.content);
            logger.info('已填写正文内容');
        }

        // 等待内容填写完成
        await this.pageOperator.delay(2000);
    }

    /**
     * 点击发布按钮 - 微博特殊处理
     */
    async clickPublishButton(page) {
        // 先等待页面稳定
        await this.pageOperator.delay(3000);

        // 先点击页面空白处，让输入框失去焦点
        logger.info('点击页面空白处，让输入框失去焦点');
        await page.evaluate(() => {
            // 点击页面空白区域
            const blankArea = document.body;
            blankArea.click();
        });

        // 等待一下让页面响应
        await this.pageOperator.delay(500);

        // 使用正确的选择器找到发送按钮
        try {
            logger.info('查找发送按钮...');

            const clickResult = await page.evaluate(() => {
                // 使用正确的选择器查找按钮
                const button = document.querySelector('[class^="Tool_check_"] button');
                if (button) {
                    console.log('找到发送按钮，准备点击');
                    button.click();
                    return true;
                }
                console.log('未找到发送按钮');
                return false;
            });

            if (clickResult) {
                logger.info('成功点击发送按钮');
            } else {
                logger.error('未找到发送按钮');
                throw new Error('未找到发送按钮');
            }

        } catch (error) {
            logger.error('点击发送按钮失败:', error.message);
            throw error;
        }

        logger.info('已点击发送按钮');
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
const weiboPublisher = new WeiboPublisher();

/**
 * 发布到微博
 */
export async function publishToWeibo(publishInfo) {
    return await weiboPublisher.publish(publishInfo);
}