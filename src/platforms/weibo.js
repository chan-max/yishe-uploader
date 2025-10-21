/**
 * 微博发布功能 - 基于通用发布器实现
 */

import { BasePublisher } from '../services/BasePublisher.js';
import { GenericLoginChecker } from '../services/LoginChecker.js';
import { PLATFORM_CONFIGS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';

/**
 * 微博发布器类
 */
class WeiboPublisher extends BasePublisher {
    constructor() {
        super('微博', PLATFORM_CONFIGS.weibo);
        this.loginChecker = new GenericLoginChecker('微博', {
            selectors: PLATFORM_CONFIGS.weibo.loginSelectors
        });
    }

    /**
     * 重写图片上传等待逻辑
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
     * 重写点击发布按钮逻辑
     */
    async clickPublishButton(page) {
        const sendButtonSelector = this.config.selectors.submitButton;
        await page.waitForSelector(sendButtonSelector, { timeout: 10000 });
        
        // 检查发布按钮是否可用
        const isButtonEnabled = await this.pageOperator.isButtonEnabled(page, sendButtonSelector);
        
        if (!isButtonEnabled) {
            logger.info('发布按钮不可用，等待图片上传完成...');
            // 等待按钮变为可用状态
            await this.pageOperator.waitForButtonEnabled(page, sendButtonSelector);
        }
        
        await page.click(sendButtonSelector);
        logger.info('已点击发送按钮');
    }

    /**
     * 重写登录状态检查
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
