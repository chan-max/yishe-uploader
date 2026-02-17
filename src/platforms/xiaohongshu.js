/**
 * 小红书发布功能 - 独立实现
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
    XiaohongshuLoginChecker
} from '../services/LoginChecker.js';
import {
    PLATFORM_CONFIGS
} from '../config/platforms.js';
import {
    logger
} from '../utils/logger.js';
import {
    xiaohongshuAuth
} from '../utils/xiaohongshuAuth.js';

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

            // 2.5. 应用小红书真实认证
            const authSuccess = await xiaohongshuAuth.applyAuth(page);
            if (!authSuccess) {
                return {
                    success: false,
                    message: '小红书认证设置失败',
                    data: {
                        error: '认证失败'
                    }
                };
            }
            logger.info('小红书认证已应用');

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

        // 等待页面完全加载
        await this.pageOperator.delay(3000);

        // 滚动到页面顶部，确保上传区域可见
        await page.evaluate(() => window.scrollTo(0, 0));
        await this.pageOperator.delay(1000);

        // 检查页面是否已进入图片上传状态
        const currentUrl = page.url();
        logger.info(`当前页面URL: ${currentUrl}`);

        const uploadResults = [];

        for (let i = 0; i < images.length; i++) {
            const imageUrl = images[i];
            let retryCount = 0;
            const maxRetries = 5; // 增加到5次重试
            let uploadSuccess = false;

            while (retryCount < maxRetries && !uploadSuccess) {
                let tempPath = null;
                try {
                    logger.info(`正在上传第 ${i + 1}/${images.length} 张图片: ${imageUrl} (尝试 ${retryCount + 1}/${maxRetries})`);

                    // 下载图片到临时目录
                    tempPath = await this.imageManager.downloadImage(imageUrl, `${this.platformName}_${Date.now()}_${i}`);

                    // 检查图片大小
                    const fs = await import('fs');
                    const stats = fs.statSync(tempPath);
                    const fileSizeInMB = stats.size / (1024 * 1024);
                    logger.info(`图片大小: ${fileSizeInMB.toFixed(2)} MB`);

                    if (fileSizeInMB > 20) {
                        logger.warn('图片过大，可能导致上传失败');
                    }

                    // 上传图片
                    await this.uploadSingleImage(page, tempPath, i);

                    uploadSuccess = true;
                    uploadResults.push({
                        index: i,
                        success: true,
                        url: imageUrl
                    });
                    logger.info(`第 ${i + 1} 张图片上传成功`);

                } catch (error) {
                    retryCount++;
                    logger.error(`处理图片 ${imageUrl} 时出错 (尝试 ${retryCount}/${maxRetries}):`, error.message);

                    // 清理临时文件
                    if (tempPath) {
                        try {
                            this.imageManager.deleteTempFile(tempPath);
                        } catch (e) {
                            logger.warn('清理临时文件失败:', e.message);
                        }
                    }

                    if (retryCount >= maxRetries) {
                        logger.error(`图片 ${imageUrl} 上传失败，已达到最大重试次数`);
                        uploadResults.push({
                            index: i,
                            success: false,
                            url: imageUrl,
                            error: error.message
                        });
                        // 不要抛出错误，继续上传其他图片
                        logger.warn(`跳过第 ${i + 1} 张图片，继续上传其他图片`);
                        break;
                    } else {
                        const waitTime = Math.min(retryCount * 2, 10); // 最长等待10秒
                        logger.info(`等待 ${waitTime} 秒后重试...`);
                        await this.pageOperator.delay(waitTime * 1000);

                        // 刷新页面到上传页面
                        try {
                            await page.goto(currentUrl, {
                                waitUntil: 'domcontentloaded',
                                timeout: 30000
                            });
                            await this.pageOperator.delay(2000);
                        } catch (refreshError) {
                            logger.warn('刷新页面失败，继续尝试:', refreshError.message);
                        }
                    }
                }
            }

            // 图片间间隔，让服务器有时间处理
            if (i < images.length - 1) {
                await this.pageOperator.delay(3000); // 增加到3秒
            }
        }

        // 检查上传结果
        const successCount = uploadResults.filter(r => r.success).length;
        const failCount = uploadResults.filter(r => !r.success).length;

        logger.info(`图片上传完成统计: 成功 ${successCount}/${images.length}，失败 ${failCount}/${images.length}`);

        if (failCount > 0) {
            logger.warn('部分图片上传失败:');
            uploadResults.filter(r => !r.success).forEach(r => {
                logger.warn(`  图片 ${r.index + 1}: ${r.error || '未知错误'}`);
            });
        }

        if (successCount === 0) {
            throw new Error('所有图片上传失败');
        }

        if (failCount > 0 && successCount > 0) {
            logger.warn(`${failCount} 张图片上传失败，但有 ${successCount} 张图片上传成功，继续发布流程`);
        }
    }

    /**
     * 上传单张图片
     */
    async uploadSingleImage(page, tempPath, imageIndex) {
        try {
            // 等待页面加载完成
            await this.pageOperator.delay(2000);

            // 滚动到页面顶部，确保上传区域可见
            await page.evaluate(() => window.scrollTo(0, 0));
            await this.pageOperator.delay(1000);

            // 查找文件输入框，尝试多种选择器
            const fileInputSelectors = [
                'input[type="file"]',
                'input[accept*="image"]',
                '.upload input[type="file"]',
                '.file-upload input[type="file"]',
                '[data-testid="file-input"]',
                '.upload-area input',
                '.drag-upload input'
            ];

            let fileInput = null;
            for (const selector of fileInputSelectors) {
                try {
                    const elements = await page.$$(selector);
                    if (elements && elements.length > 0) {
                        // 如果有多个，优先选择可见的
                        for (let element of elements) {
                            const isVisible = await element.evaluate(el => {
                                return el.offsetParent !== null;
                            });
                            if (isVisible) {
                                fileInput = element;
                                logger.info(`找到可见的文件输入框: ${selector}`);
                                break;
                            }
                        }
                        if (!fileInput && elements.length > 0) {
                            fileInput = elements[0];
                            logger.info(`找到文件输入框: ${selector} (使用第一个)`);
                        }
                        if (fileInput) break;
                    }
                } catch (error) {
                    logger.debug(`选择器 ${selector} 未找到文件输入框: ${error.message}`);
                }
            }

            if (!fileInput) {
                // 如果找不到文件输入框，尝试点击上传区域
                logger.info('尝试点击上传区域');
                const uploadAreaSelectors = [
                    '.upload-area',
                    '.drag-upload',
                    '.upload-btn',
                    '.add-image',
                    '[data-testid="upload-area"]',
                    '.upload-zone',
                    '.reds-btn',
                    'button[type="button"]'
                ];

                for (const selector of uploadAreaSelectors) {
                    try {
                        const elements = await page.$$(selector);
                        for (let uploadArea of elements) {
                            try {
                                const text = await uploadArea.evaluate(el => el.textContent || el.innerText);
                                // 检查是否是上传按钮
                                if (text && (text.includes('上传') || text.includes('选择') || text.includes('添加'))) {
                                    logger.info(`点击上传按钮: ${selector}, 文本: ${text}`);
                                    await uploadArea.click({
                                        delay: 100
                                    });
                                    await this.pageOperator.delay(1500);

                                    // 再次尝试查找文件输入框
                                    const inputs = await page.$$('input[type="file"]');
                                    if (inputs && inputs.length > 0) {
                                        fileInput = inputs[inputs.length - 1]; // 使用最后一个（通常是新出现的）
                                        logger.info('找到文件输入框');
                                        break;
                                    }
                                }
                            } catch (e) {
                                logger.debug(`检查元素失败: ${e.message}`);
                            }
                        }
                        if (fileInput) break;
                    } catch (error) {
                        logger.debug(`上传区域 ${selector} 点击失败: ${error.message}`);
                    }
                }
            }

            if (!fileInput) {
                throw new Error('未找到文件选择器，请检查页面是否已加载完成');
            }

            // 上传文件
            logger.info(`开始上传文件: ${tempPath}`);
            // Playwright: setInputFiles 替代 Puppeteer 的 uploadFile
            await fileInput.setInputFiles(tempPath);
            logger.info(`文件已选择，等待上传...`);

            // 等待图片上传完成
            await this.waitForImageUploadComplete(page, imageIndex);

        } catch (error) {
            logger.error(`上传图片 ${imageIndex + 1} 失败:`, error);
            throw error;
        }
    }

    /**
     * 等待图片上传完成
     */
    async waitForImageUploadComplete(page, imageIndex) {
        try {
            // 等待图片上传完成，检查多种可能的完成状态
            const uploadCompleteSelectors = [
                '.upload-success',
                '.image-preview',
                '.uploaded-image',
                '.image-item',
                '[data-testid="upload-success"]',
                '.upload-complete',
                '.reds-uploader__img',
                '.uploader-img'
            ];

            let uploadComplete = false;
            const maxWaitTime = 20000; // 增加到20秒超时
            const startTime = Date.now();
            let lastLoadingState = false;

            while (!uploadComplete && (Date.now() - startTime) < maxWaitTime) {
                // 检查完成状态
                for (const selector of uploadCompleteSelectors) {
                    try {
                        const elements = await page.$$(selector);
                        if (elements && elements.length > imageIndex + 1) {
                            logger.info(`图片上传完成，检测到 ${elements.length} 个已上传图片`);
                            uploadComplete = true;
                            break;
                        }
                    } catch (error) {
                        if (this.pageOperator.isFatalError(error)) throw error;
                        // 继续检查其他选择器
                    }
                }

                if (!uploadComplete) {
                    // 检查是否还有loading状态
                    const loadingSelectors = [
                        '.upload-loading',
                        '.loading',
                        '.spinner',
                        '[data-testid="loading"]',
                        '.reds-uploader__progress'
                    ];

                    let hasLoading = false;
                    for (const selector of loadingSelectors) {
                        try {
                            const loading = await page.$(selector);
                            if (loading) {
                                const isVisible = await loading.evaluate(el => {
                                    const style = window.getComputedStyle(el);
                                    return style.display !== 'none' && style.visibility !== 'hidden';
                                });
                                if (isVisible) {
                                    hasLoading = true;
                                    lastLoadingState = true;
                                    break;
                                }
                            }
                        } catch (error) {
                            if (this.pageOperator.isFatalError(error)) throw error;
                            // 继续检查
                        }
                    }

                    // 如果之前有loading状态，现在没有了，认为上传完成
                    if (lastLoadingState && !hasLoading) {
                        logger.info('检测到loading状态消失，上传可能已完成');
                        uploadComplete = true;
                        break;
                    }

                    if (!hasLoading && (Date.now() - startTime) > 3000) {
                        // 3秒后如果没有loading状态，假设已完成
                        uploadComplete = true;
                        logger.info('未检测到loading状态，假设上传完成');
                        break;
                    }

                    await this.pageOperator.delay(500);
                }
            }

            if (!uploadComplete) {
                logger.warn(`图片 ${imageIndex + 1} 上传超时，但继续执行`);
            } else {
                logger.info(`图片 ${imageIndex + 1} 上传完成确认`);
            }

            // 额外等待确保页面稳定
            await this.pageOperator.delay(1500);

        } catch (error) {
            if (this.pageOperator.isFatalError(error)) throw error;
            logger.warn(`等待图片上传完成时出错: ${error.message}`);
            // 即使出错也继续执行
        }
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
        // 等待页面稳定
        await this.pageOperator.delay(2000);

        // 先点击页面空白处，让输入框失去焦点
        logger.info('点击页面空白处，让输入框失去焦点');
        await page.evaluate(() => {
            document.body.click();
        });

        await this.pageOperator.delay(500);

        // 尝试多种方式点击发布按钮
        try {
            // 方式1: 使用JavaScript直接点击
            logger.info('尝试方式1: 使用JavaScript点击');
            const clickResult = await page.evaluate(() => {
                // 查找所有可能的发布按钮
                const buttons = document.querySelectorAll('button');
                for (let button of buttons) {
                    const text = button.textContent || button.innerText;
                    if (text && (text.includes('发布') || text.includes('Post'))) {
                        console.log(`找到发布按钮: ${text}`);
                        button.click();
                        return true;
                    }
                }

                // 尝试使用常见的发布按钮选择器
                const selectors = [
                    '.submit button',
                    '.publish-btn',
                    '[data-testid="publish-btn"]',
                    'button[type="button"]'
                ];

                for (const selector of selectors) {
                    const button = document.querySelector(selector);
                    if (button) {
                        button.click();
                        return true;
                    }
                }

                return false;
            });

            if (clickResult) {
                logger.info('成功点击发布按钮');
            } else {
                logger.error('未找到发布按钮');
                throw new Error('未找到发布按钮');
            }

        } catch (error) {
            logger.error('点击发布按钮失败:', error.message);
            throw error;
        }

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