/**
 * 抖音发布功能 - 基于通用发布器实现
 */

import { BasePublisher } from '../services/BasePublisher.js';
import { DouyinLoginChecker } from '../services/LoginChecker.js';
import { PLATFORM_CONFIGS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';

/**
 * 抖音发布器类
 */
class DouyinPublisher extends BasePublisher {
    constructor() {
        super('抖音', PLATFORM_CONFIGS.douyin);
        this.loginChecker = new DouyinLoginChecker();
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
            await this.pageOperator.fillInput(page, this.config.selectors.titleInput, publishInfo.title);
            logger.info('已填写标题:', publishInfo.title);
        } else {
            logger.info('标题为空，跳过填写');
        }

        // 填写正文内容
        if (publishInfo.content) {
            await this.pageOperator.fillInput(page, this.config.selectors.contentInput, publishInfo.content);
            logger.info('已填写正文内容:', publishInfo.content);
        } else {
            logger.info('正文内容为空，跳过填写');
        }

        // 等待内容填写完成
        await this.pageOperator.delay(3000);
    }

    /**
     * 重写点击发布按钮逻辑
     */
    async clickPublishButton(page) {
        try {
            const buttonSelector = this.config.selectors.submitButton;
            await page.waitForSelector(buttonSelector, { timeout: 5000 });
            const publishButton = await page.$(buttonSelector);
            
            if (!publishButton) {
                throw new Error('未找到发布按钮：' + buttonSelector);
            }

            await page.evaluate((selector) => {
                const button = document.querySelector(selector);
                if (button) {
                    button.click();
                }
            }, buttonSelector);
            logger.info('已点击发布按钮');
        } catch (error) {
            logger.error('点击发布按钮失败:', error);
            throw new Error(`发布按钮点击失败: ${error.message}`);
        }
    }
}

// 创建单例实例
const douyinPublisher = new DouyinPublisher();

/**
 * 发布到抖音
 */
export async function publishToDouyin(publishInfo) {
    return await douyinPublisher.publish(publishInfo);
}

/**
 * 专门检测抖音登录状态的方法（保持向后兼容）
 */
export async function checkDouyinLoginStatus(page) {
    const douyinChecker = new DouyinLoginChecker();
    return await douyinChecker.checkLoginStatus(page);
}
