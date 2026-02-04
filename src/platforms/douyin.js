/**
 * 抖音发布功能 - 完整实现
 * 参考 social-auto-upload 的 Python 实现
 */

import { getOrCreateBrowser } from '../services/BrowserService.js';
import { PageOperator } from '../services/PageOperator.js';
import { logger } from '../utils/logger.js';

/**
 * 抖音发布器类
 */
class DouyinPublisher {
    constructor() {
        this.platformName = '抖音';
        this.uploadUrl = 'https://creator.douyin.com/creator-micro/content/upload';
        this.pageOperator = new PageOperator();
    }

    /**
     * 发布到抖音
     */
    async publish(publishInfo) {
        let page = null;
        try {
            logger.info(`开始执行${this.platformName}发布操作`);

            // 1. 获取浏览器和页面
            const browser = await getOrCreateBrowser();
            page = await browser.newPage();
            logger.info('新页面创建成功');

            // 2. 应用反检测（暂时禁用，因为会导致页面显示错误）
            // await this.pageOperator.setupAntiDetection(page);
            // logger.info('反检测脚本已应用');

            // 3. 导航到上传页面（浏览器应已通过CDP模式登录）
            await page.goto(this.uploadUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            logger.info(`已打开${this.platformName}上传页面`);

            // 4. 等待页面加载
            await page.waitForURL(this.uploadUrl, { timeout: 5000 });

            // 5. 检查登录状态
            const loginCheckSelectors = [
                'text=手机号登录',
                'text=扫码登录'
            ];

            for (const selector of loginCheckSelectors) {
                const count = await page.locator(selector).count();
                if (count > 0) {
                    throw new Error('抖音未登录，请先登录');
                }
            }
            logger.info('登录状态检查通过');

            // 6. 上传视频
            await this.uploadVideo(page, publishInfo.videoUrl || publishInfo.filePath);

            // 7. 等待跳转到发布页面（兼容两种版本）
            await this.waitForPublishPage(page);

            // 8. 填写标题和话题
            await this.fillTitleAndTags(page, publishInfo);

            // 等待内容保存（重要：确保标题和标签已经填写完成并保存）
            logger.info('等待内容保存...');
            await this.pageOperator.delay(3000);

            // 9. 等待视频上传完成
            await this.waitForVideoUploadComplete(page);

            // 10. 设置商品链接（如果有）
            if (publishInfo.platformSettings?.douyin?.productLink) {
                await this.setProductLink(page, publishInfo.platformSettings.douyin);
            }

            // 11. 设置封面（如果有）
            if (publishInfo.platformSettings?.douyin?.thumbnail) {
                await this.setThumbnail(page, publishInfo.platformSettings.douyin.thumbnail);
            }

            // 12. 设置地理位置（如果有）
            if (publishInfo.platformSettings?.douyin?.location) {
                await this.setLocation(page, publishInfo.platformSettings.douyin.location);
            }

            // 13. 设置第三方平台同步
            await this.setThirdPartySync(page);

            // 14. 设置定时发布（如果有）
            if (publishInfo.scheduled && publishInfo.scheduleTime) {
                await this.setScheduleTime(page, publishInfo.scheduleTime);
            }

            // 15. 点击发布按钮
            await this.clickPublishButton(page);

            // 16. 等待发布完成
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
                    await page.screenshot({ path: `error_douyin_${Date.now()}.png`, fullPage: true });
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

        const fileInput = await page.locator("div[class^='container'] input").first();
        await fileInput.setInputFiles(filePath);

        logger.info('视频文件已选择');
    }

    /**
     * 等待跳转到发布页面（兼容两种版本）
     */
    async waitForPublishPage(page) {
        logger.info('等待跳转到发布页面...');

        const version1Url = 'https://creator.douyin.com/creator-micro/content/publish?enter_from=publish_page';
        const version2Url = 'https://creator.douyin.com/creator-micro/content/post/video?enter_from=publish_page';

        let entered = false;
        const maxRetries = 60; // 最多等待60秒

        for (let i = 0; i < maxRetries; i++) {
            try {
                // 尝试等待第一个URL
                await page.waitForURL(version1Url, { timeout: 1000 });
                logger.info('成功进入 version_1 发布页面');
                entered = true;
                break;
            } catch (e1) {
                try {
                    // 尝试等待第二个URL
                    await page.waitForURL(version2Url, { timeout: 1000 });
                    logger.info('成功进入 version_2 发布页面');
                    entered = true;
                    break;
                } catch (e2) {
                    logger.debug(`等待发布页面... (${i + 1}/${maxRetries})`);
                    await this.pageOperator.delay(500);
                }
            }
        }

        if (!entered) {
            throw new Error('超时未进入视频发布页面');
        }
    }

    /**
     * 填写标题、描述和话题
     */
    async fillTitleAndTags(page, publishInfo) {
        logger.info('开始填充标题、描述和话题...');

        // 等待页面稳定
        await this.pageOperator.delay(2000);

        logger.info(`准备填写标题: ${publishInfo.title || '(无)'}`);
        logger.info(`准备填写描述: ${publishInfo.description || '(无)'}`);
        logger.info(`准备填写标签: ${JSON.stringify(publishInfo.tags || [])}`);

        // ===== 1. 填写标题（第一个输入框）=====
        if (publishInfo.title) {
            try {
                logger.info('开始填写标题...');

                // 尝试通过 "作品标题" 文本定位
                const titleLabel = page.locator('text=作品标题');
                const titleInput = titleLabel.locator('..').locator('xpath=following-sibling::div[1]').locator('input');

                const count = await titleInput.count();
                logger.info(`找到 ${count} 个标题输入框`);

                if (count > 0) {
                    await titleInput.click();
                    await this.pageOperator.delay(300);
                    await titleInput.fill('');
                    await this.pageOperator.delay(200);
                    await titleInput.fill(publishInfo.title.substring(0, 30));
                    await this.pageOperator.delay(500);
                    logger.success(`标题填写成功: ${publishInfo.title.substring(0, 30)}`);
                } else {
                    logger.warn('未找到标题输入框');
                }
            } catch (error) {
                logger.error('填写标题失败:', error.message);
            }
        }

        // ===== 2. 填写描述（.notranslate 或第二个输入区域）=====
        const description = publishInfo.description || publishInfo.title || '';
        if (description) {
            try {
                logger.info('开始填写描述...');

                // 方式1: 尝试通过 .notranslate 类定位描述框
                const descContainer = page.locator('.notranslate').first();
                const descCount = await descContainer.count();

                if (descCount > 0) {
                    logger.info('找到描述输入框（.notranslate）');

                    // 等待元素可见
                    await descContainer.waitFor({ timeout: 5000 });

                    // 点击激活
                    await descContainer.click();
                    await this.pageOperator.delay(500);

                    // 清空内容
                    await page.keyboard.press('Control+KeyA');
                    await this.pageOperator.delay(200);
                    await page.keyboard.press('Delete');
                    await this.pageOperator.delay(300);

                    // 输入描述
                    await page.keyboard.type(description, { delay: 30 });
                    await this.pageOperator.delay(500);

                    logger.success(`描述填写成功: ${description.substring(0, 50)}...`);
                } else {
                    logger.warn('未找到描述输入框');
                }
            } catch (error) {
                logger.error('填写描述失败:', error.message);
            }
        }

        // ===== 3. 填写话题标签 =====
        if (publishInfo.tags && publishInfo.tags.length > 0) {
            logger.info(`开始填写 ${publishInfo.tags.length} 个话题标签`);

            try {
                const cssSelector = '.zone-container';

                // 等待话题输入区域出现
                await page.waitForSelector(cssSelector, { timeout: 5000 });
                await this.pageOperator.delay(500);

                for (let i = 0; i < publishInfo.tags.length; i++) {
                    const tag = publishInfo.tags[i];
                    logger.info(`正在添加话题 ${i + 1}/${publishInfo.tags.length}: #${tag}`);

                    // 点击输入区域
                    await page.locator(cssSelector).click();
                    await this.pageOperator.delay(300);

                    // 输入话题（带#号）
                    await page.keyboard.type(`#${tag}`, { delay: 50 });
                    await this.pageOperator.delay(500);

                    // 按空格确认
                    await page.keyboard.press('Space');
                    await this.pageOperator.delay(500);

                    logger.info(`话题 #${tag} 添加成功`);
                }

                logger.success(`总共添加了 ${publishInfo.tags.length} 个话题`);

                // 等待话题保存
                await this.pageOperator.delay(1000);
            } catch (error) {
                logger.error('填写话题标签失败:', error);
            }
        } else {
            logger.info('没有话题标签需要填写');
        }
    }

    /**
     * 等待视频上传完成
     */
    async waitForVideoUploadComplete(page) {
        logger.info('等待视频上传完成...');

        const maxRetries = 300; // 最多等待10分钟
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                // 检查"重新上传"按钮是否出现
                const reuploadButton = page.locator('[class^="long-card"] div:has-text("重新上传")');
                const count = await reuploadButton.count();

                if (count > 0) {
                    logger.success('视频上传完毕');
                    break;
                }

                // 检查是否上传失败
                const failedText = page.locator('div.progress-div > div:has-text("上传失败")');
                const failedCount = await failedText.count();

                if (failedCount > 0) {
                    logger.error('视频上传失败，尝试重新上传');
                    await this.handleUploadError(page);
                }

                if (retryCount % 10 === 0) {
                    logger.info('视频上传中...');
                }

                await this.pageOperator.delay(2000);
                retryCount++;

            } catch (error) {
                logger.warn('检查上传状态时出错:', error.message);
                await this.pageOperator.delay(2000);
                retryCount++;
            }
        }

        if (retryCount >= maxRetries) {
            throw new Error('视频上传超时');
        }
    }

    /**
     * 处理上传错误
     */
    async handleUploadError(page) {
        logger.info('处理上传错误，重新上传视频');
        // 这里可以实现重新上传逻辑
        throw new Error('视频上传失败');
    }

    /**
     * 设置商品链接
     */
    async setProductLink(page, settings) {
        logger.info('开始设置商品链接...');

        try {
            await this.pageOperator.delay(2000);

            // 找到"添加标签"下拉框
            const dropdown = page.locator('text=添加标签')
                .locator('..')
                .locator('..')
                .locator('..')
                .locator('.semi-select')
                .first();

            await dropdown.click();
            await page.waitForSelector('[role="listbox"]', { timeout: 5000 });

            // 选择"购物车"选项
            await page.locator('[role="option"]:has-text("购物车")').click();
            logger.info('已选择购物车选项');

            // 输入商品链接
            await page.waitForSelector('input[placeholder="粘贴商品链接"]', { timeout: 5000 });
            const linkInput = page.locator('input[placeholder="粘贴商品链接"]');
            await linkInput.fill(settings.productLink);
            logger.info('已输入商品链接');

            // 点击"添加链接"按钮
            const addButton = page.locator('span:has-text("添加链接")');
            await addButton.click();
            logger.info('已点击添加链接按钮');

            await this.pageOperator.delay(2000);

            // 检查是否有错误提示
            const errorModal = page.locator('text=未搜索到对应商品');
            const errorCount = await errorModal.count();

            if (errorCount > 0) {
                logger.error('商品链接无效');
                const confirmButton = page.locator('button:has-text("确定")');
                await confirmButton.click();
                return false;
            }

            // 填写商品短标题
            await this.handleProductDialog(page, settings.productTitle);

            logger.success('商品链接设置完成');
            return true;

        } catch (error) {
            logger.error('设置商品链接失败:', error);
            return false;
        }
    }

    /**
     * 处理商品编辑弹窗
     */
    async handleProductDialog(page, productTitle) {
        await this.pageOperator.delay(2000);
        await page.waitForSelector('input[placeholder="请输入商品短标题"]', { timeout: 10000 });

        const shortTitleInput = page.locator('input[placeholder="请输入商品短标题"]');
        await shortTitleInput.fill(productTitle.substring(0, 10));

        await this.pageOperator.delay(1000);

        const finishButton = page.locator('button:has-text("完成编辑")');
        const buttonClass = await finishButton.getAttribute('class');

        if (!buttonClass.includes('disabled')) {
            await finishButton.click();
            logger.info('已点击完成编辑按钮');
            await page.waitForSelector('.semi-modal-content', { state: 'hidden', timeout: 5000 });
            return true;
        } else {
            logger.error('完成编辑按钮被禁用');
            const cancelButton = page.locator('button:has-text("取消")');
            await cancelButton.click();
            return false;
        }
    }

    /**
     * 设置封面
     */
    async setThumbnail(page, thumbnailPath) {
        if (!thumbnailPath) return;

        logger.info('开始设置视频封面...');

        try {
            await page.locator('text="选择封面"').click();
            await page.waitForSelector('div.dy-creator-content-modal', { timeout: 5000 });

            await page.locator('text="设置竖封面"').click();
            await this.pageOperator.delay(2000);

            // 上传封面图片
            const uploadInput = page.locator("div[class^='semi-upload upload'] >> input.semi-upload-hidden-input");
            await uploadInput.setInputFiles(thumbnailPath);

            await this.pageOperator.delay(2000);

            // 点击完成按钮
            await page.locator("div#tooltip-container button:visible:has-text('完成')").click();

            // 等待封面设置对话框关闭
            await page.waitForSelector('div.extractFooter', { state: 'detached', timeout: 5000 });

            logger.success('视频封面设置完成');
        } catch (error) {
            logger.error('设置封面失败:', error);
        }
    }

    /**
     * 设置地理位置
     */
    async setLocation(page, location) {
        if (!location) return;

        logger.info('开始设置地理位置...');

        try {
            await page.locator('div.semi-select span:has-text("输入地理位置")').click();
            await page.keyboard.press('Backspace');
            await this.pageOperator.delay(2000);

            await page.keyboard.type(location);
            await page.waitForSelector('div[role="listbox"] [role="option"]', { timeout: 5000 });

            await page.locator('div[role="listbox"] [role="option"]').first().click();

            logger.success('地理位置设置完成');
        } catch (error) {
            logger.error('设置地理位置失败:', error);
        }
    }

    /**
     * 设置第三方平台同步（头条/西瓜）
     */
    async setThirdPartySync(page) {
        try {
            const thirdPartElement = '[class^="info"] > [class^="first-part"] div div.semi-switch';
            const count = await page.locator(thirdPartElement).count();

            if (count > 0) {
                const className = await page.locator(thirdPartElement).getAttribute('class');
                if (!className.includes('semi-switch-checked')) {
                    await page.locator(thirdPartElement).locator('input.semi-switch-native-control').click();
                    logger.info('已启用第三方平台同步');
                }
            }
        } catch (error) {
            logger.debug('第三方平台同步设置跳过');
        }
    }

    /**
     * 设置定时发布
     */
    async setScheduleTime(page, scheduleTime) {
        logger.info('开始设置定时发布...');

        try {
            // 点击定时发布单选框
            const labelElement = page.locator("[class^='radio']:has-text('定时发布')");
            await labelElement.click();
            await this.pageOperator.delay(1000);

            // 格式化时间
            const publishDate = new Date(scheduleTime);
            const formattedTime = publishDate.toISOString().slice(0, 16).replace('T', ' ');

            // 输入时间
            await page.locator('.semi-input[placeholder="日期和时间"]').click();
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

        const publishButton = page.locator('button:has-text("发布")').filter({ hasText: /^发布$/ });
        await publishButton.click();

        logger.info('已点击发布按钮');
    }

    /**
     * 等待发布完成
     */
    async waitForPublishComplete(page) {
        logger.info('等待发布完成...');

        const maxRetries = 60;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                // 检查是否跳转到作品管理页面
                await page.waitForURL('https://creator.douyin.com/creator-micro/content/manage**', { timeout: 1000 });
                logger.success('发布成功，已跳转到作品管理页面');
                return true;
            } catch (error) {
                // 检查是否需要自动选择封面
                try {
                    await this.handleAutoVideoCover(page);
                } catch (e) {
                    // 忽略
                }

                logger.debug(`等待发布完成... (${retryCount + 1}/${maxRetries})`);

                // 截图记录
                if (retryCount % 10 === 0) {
                    try {
                        await page.screenshot({ path: `publishing_${Date.now()}.png`, fullPage: true });
                    } catch (e) {
                        // 忽略截图错误
                    }
                }

                await this.pageOperator.delay(500);
                retryCount++;
            }
        }

        throw new Error('发布超时');
    }

    /**
     * 处理自动选择封面
     */
    async handleAutoVideoCover(page) {
        // 检查是否出现"请设置封面后再发布"提示
        const coverPrompt = page.locator('text=请设置封面后再发布').first();
        const isVisible = await coverPrompt.isVisible().catch(() => false);

        if (isVisible) {
            logger.info('检测到需要设置封面提示，自动选择推荐封面');

            // 选择第一个推荐封面
            const recommendCover = page.locator('[class^="recommendCover-"]').first();
            const count = await recommendCover.count();

            if (count > 0) {
                await recommendCover.click();
                await this.pageOperator.delay(1000);

                // 处理确认弹窗
                const confirmText = 'text=是否确认应用此封面？';
                const confirmVisible = await page.locator(confirmText).first().isVisible().catch(() => false);

                if (confirmVisible) {
                    await page.locator('button:has-text("确定")').click();
                    logger.info('已确认应用封面');
                    await this.pageOperator.delay(1000);
                }

                logger.success('封面选择完成');
                return true;
            }
        }

        return false;
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

export default douyinPublisher;
