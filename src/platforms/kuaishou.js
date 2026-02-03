/**
 * 快手发布功能 - 完整实现
 * 参考 social-auto-upload 的 Python 实现
 */

import { getOrCreateBrowser } from '../services/BrowserService.js';
import { PageOperator } from '../services/PageOperator.js';
import { logger } from '../utils/logger.js';
import { kuaishouAuth } from '../utils/kuaishouAuth.js';

/**
 * 快手发布器类
 */
class KuaishouPublisher {
    constructor() {
        this.platformName = '快手';
        this.uploadUrl = 'https://cp.kuaishou.com/article/publish/video';
        this.pageOperator = new PageOperator();
        this.maxTags = 3; // 快手最多支持3个话题
    }

    /**
     * 发布到快手
     */
    async publish(publishInfo) {
        let page = null;
        try {
            logger.info(`开始执行${this.platformName}发布操作`);

            // 1. 获取浏览器和页面
            const browser = await getOrCreateBrowser();
            page = await browser.newPage();
            logger.info('新页面创建成功');

            // 2. 应用反检测
            await this.pageOperator.setupAntiDetection(page);
            logger.info('反检测脚本已应用');

            // 3. 应用认证
            const authSuccess = await kuaishouAuth.applyAuth(page);
            if (!authSuccess) {
                throw new Error('快手认证设置失败');
            }
            logger.info('快手认证已应用');

            // 4. 导航到上传页面
            await page.goto(this.uploadUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            logger.info(`已打开${this.platformName}上传页面`);

            // 5. 等待页面加载
            await page.waitForURL(this.uploadUrl, { timeout: 5000 });

            // 6. 检查登录状态
            const loginCheck = await page.locator('div.names div.container div.name:text("机构服务")').count();
            if (loginCheck > 0) {
                throw new Error('快手未登录，请先登录');
            }
            logger.info('登录状态检查通过');

            // 7. 上传视频
            await this.uploadVideo(page, publishInfo.videoUrl || publishInfo.filePath);

            // 8. 等待进入编辑页面
            await this.pageOperator.delay(2000);

            // 9. 处理新功能提示
            await this.handleNewFeaturePrompt(page);

            // 10. 填写描述和话题
            await this.fillDescriptionAndTags(page, publishInfo);

            // 11. 等待视频上传完成
            await this.waitForVideoUploadComplete(page);

            // 12. 设置定时发布（如果有）
            if (publishInfo.scheduled && publishInfo.scheduleTime) {
                await this.setScheduleTime(page, publishInfo.scheduleTime);
            }

            // 13. 点击发布按钮
            await this.clickPublishButton(page);

            // 14. 等待发布完成
            await this.waitForPublishComplete(page);

            logger.success(`${this.platformName}发布成功`);

            return {
                success: true,
                message: `${this.platformName}发布成功`
            };

        } catch (error) {
            logger.error(`${this.platformName}发布过程出错:`, error);
            
            // 截图保存错误现场
            if (page) {
                try {
                    await page.screenshot({ path: `error_kuaishou_${Date.now()}.png`, fullPage: true });
                } catch (e) {
                    logger.warn('截图失败:', e);
                }
            }

            return {
                success: false,
                message: error.message || '未知错误',
                error: error
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
     * 上传视频文件
     */
    async uploadVideo(page, filePath) {
        logger.info('开始上传视频文件');
        
        // 等待上传按钮出现
        const uploadButton = page.locator("button[class^='_upload-btn']");
        await uploadButton.waitFor({ state: 'visible', timeout: 10000 });
        
        // 使用文件选择器上传
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            uploadButton.click()
        ]);
        
        await fileChooser.setFiles(filePath);
        logger.info('视频文件已选择');
        
        await this.pageOperator.delay(2000);
    }

    /**
     * 处理新功能提示弹窗
     */
    async handleNewFeaturePrompt(page) {
        try {
            const newFeatureButton = page.locator('button[type="button"] span:text("我知道了")');
            const count = await newFeatureButton.count();
            
            if (count > 0) {
                await newFeatureButton.click();
                logger.info('已关闭新功能提示');
            }
        } catch (error) {
            logger.debug('无新功能提示弹窗');
        }
    }

    /**
     * 填写描述和话题
     */
    async fillDescriptionAndTags(page, publishInfo) {
        logger.info('开始填充描述和话题...');
        
        // 点击描述输入框
        await page.locator('text=描述').locator('xpath=following-sibling::div').click();
        
        // 清空现有内容
        logger.info('清空现有标题');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Control+KeyA');
        await page.keyboard.press('Delete');
        
        // 输入新标题
        logger.info('填写新标题');
        await page.keyboard.type(publishInfo.title);
        await page.keyboard.press('Enter');
        
        // 添加话题标签（快手最多3个）
        if (publishInfo.tags && publishInfo.tags.length > 0) {
            const tagsToAdd = publishInfo.tags.slice(0, this.maxTags);
            
            for (let i = 0; i < tagsToAdd.length; i++) {
                const tag = tagsToAdd[i];
                logger.info(`正在添加第 ${i + 1} 个话题: #${tag}`);
                await page.keyboard.type(`#${tag} `);
                await this.pageOperator.delay(2000);
            }
            
            logger.info(`总共添加了 ${tagsToAdd.length} 个话题`);
            
            if (publishInfo.tags.length > this.maxTags) {
                logger.warn(`快手最多支持 ${this.maxTags} 个话题，已忽略多余的 ${publishInfo.tags.length - this.maxTags} 个`);
            }
        }
    }

    /**
     * 等待视频上传完成
     */
    async waitForVideoUploadComplete(page) {
        logger.info('等待视频上传完成...');
        
        const maxRetries = 60; // 最多等待2分钟
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                // 检查"上传中"文本是否消失
                const uploadingCount = await page.locator('text=上传中').count();
                
                if (uploadingCount === 0) {
                    logger.success('视频上传完毕');
                    break;
                } else {
                    if (retryCount % 5 === 0) {
                        logger.info('视频上传中...');
                    }
                    await this.pageOperator.delay(2000);
                }
            } catch (error) {
                logger.error('检查上传状态时发生错误:', error);
                await this.pageOperator.delay(2000);
            }
            
            retryCount++;
        }
        
        if (retryCount >= maxRetries) {
            logger.warn('超过最大重试次数，视频上传可能未完成');
        }
    }

    /**
     * 设置定时发布
     */
    async setScheduleTime(page, scheduleTime) {
        logger.info('开始设置定时发布...');
        
        try {
            // 点击定时发布单选框
            await page.locator("label:text('发布时间')")
                .locator('xpath=following-sibling::div')
                .locator('.ant-radio-input')
                .nth(1)
                .click();
            
            await this.pageOperator.delay(1000);
            
            // 格式化时间
            const publishDate = new Date(scheduleTime);
            const formattedTime = publishDate.toISOString().slice(0, 19).replace('T', ' ');
            
            // 点击日期时间选择器
            await page.locator('div.ant-picker-input input[placeholder="选择日期时间"]').click();
            await this.pageOperator.delay(1000);
            
            // 输入时间
            await page.keyboard.press('Control+KeyA');
            await page.keyboard.type(formattedTime);
            await page.keyboard.press('Enter');
            
            await this.pageOperator.delay(1000);
            logger.success('定时发布设置完成');
        } catch (error) {
            logger.error('设置定时发布失败:', error);
        }
    }

    /**
     * 点击发布按钮
     */
    async clickPublishButton(page) {
        logger.info('准备点击发布按钮...');
        
        // 第一步：点击"发布"按钮
        const publishButton = page.locator('button:has-text("发布")').filter({ hasText: /^发布$/ });
        await publishButton.click();
        logger.info('已点击发布按钮');
        
        await this.pageOperator.delay(1000);
        
        // 第二步：点击"确认发布"按钮
        const confirmButton = page.locator('button:has-text("确认发布")');
        const confirmCount = await confirmButton.count();
        
        if (confirmCount > 0) {
            await confirmButton.click();
            logger.info('已点击确认发布按钮');
        }
    }

    /**
     * 等待发布完成
     */
    async waitForPublishComplete(page) {
        logger.info('等待发布完成...');
        
        const targetUrl = 'https://cp.kuaishou.com/article/manage/video?status=2&from=publish';
        const maxRetries = 60;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                // 检查是否跳转到作品管理页面
                await page.waitForURL(targetUrl, { timeout: 1000 });
                logger.success('发布成功，已跳转到作品管理页面');
                return true;
            } catch (error) {
                logger.debug(`等待发布完成... (${retryCount + 1}/${maxRetries})`);
                
                // 截图记录
                if (retryCount % 10 === 0) {
                    try {
                        await page.screenshot({ path: `publishing_ks_${Date.now()}.png`, fullPage: true });
                    } catch (e) {
                        // 忽略截图错误
                    }
                }
                
                await this.pageOperator.delay(1000);
                retryCount++;
            }
        }
        
        throw new Error('发布超时');
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

export default kuaishouPublisher;
