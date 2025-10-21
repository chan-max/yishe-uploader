/**
 * 小红书发布功能 - 基于通用发布器实现
 */

import { BasePublisher } from '../services/BasePublisher.js';
import { XiaohongshuLoginChecker } from '../services/LoginChecker.js';
import { PLATFORM_CONFIGS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';

/**
 * 小红书发布器类
 */
class XiaohongshuPublisher extends BasePublisher {
    constructor() {
        super('小红书', PLATFORM_CONFIGS.xiaohongshu);
        this.loginChecker = new XiaohongshuLoginChecker();
    }

    /**
     * 重写登录状态检查
     */
    async checkLoginStatus(page) {
        return await this.loginChecker.checkLoginStatus(page);
    }

    /**
     * 重写填写内容逻辑
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
     * 重写点击发布按钮逻辑
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
     * 重写等待发布完成逻辑
     */
    async waitForPublishComplete(page) {
        await this.pageOperator.delay(5000);
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