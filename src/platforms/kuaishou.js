/**
 * 快手发布功能 - 基于通用发布器实现
 */

import { BasePublisher } from '../services/BasePublisher.js';
import { GenericLoginChecker } from '../services/LoginChecker.js';
import { PLATFORM_CONFIGS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';

/**
 * 快手发布器类
 */
class KuaishouPublisher extends BasePublisher {
    constructor() {
        super('快手', PLATFORM_CONFIGS.kuaishou);
        this.loginChecker = new GenericLoginChecker('快手', {
            selectors: PLATFORM_CONFIGS.kuaishou.loginSelectors
        });
    }

    /**
     * 重写图片上传逻辑 - 快手需要特殊处理
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
        
        // 一次性上传所有图片
        const uploadButtons = await page.$$('button[class^="_upload-btn_"]');
        const uploadButton = uploadButtons[1];
        if (!uploadButton) {
            throw new Error('未找到上传按钮');
        }
        
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            uploadButton.click()
        ]);
        
        await fileChooser.accept(tempPaths);
        logger.info('已上传所有图片:', tempPaths);
        
        await this.pageOperator.delay(2000);
        
        // 删除临时文件
        this.imageManager.deleteTempFiles(tempPaths);
    }

    /**
     * 重写填写内容逻辑 - 快手使用富文本编辑器
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
     * 重写登录状态检查
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
