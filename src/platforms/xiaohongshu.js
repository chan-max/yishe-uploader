/**
 * 小红书发布功能 - 独立实现
 */

import { getOrCreateBrowser } from '../services/BrowserService.js';
import { ImageManager } from '../services/ImageManager.js';
import { PageOperator } from '../services/PageOperator.js';
import { XiaohongshuLoginChecker } from '../services/LoginChecker.js';
import { PLATFORM_CONFIGS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';
import { xiaohongshuAuth } from '../utils/xiaohongshuAuth.js';

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
                    data: { error: '认证失败' }
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
        
        // 等待页面完全加载
        await this.pageOperator.delay(3000);
        
        // 检查页面是否已进入图片上传状态
        const currentUrl = page.url();
        logger.info(`当前页面URL: ${currentUrl}`);
        
        for (let i = 0; i < images.length; i++) {
            const imageUrl = images[i];
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    logger.info(`正在上传第 ${i + 1}/${images.length} 张图片: ${imageUrl} (尝试 ${retryCount + 1}/${maxRetries})`);
                    
                    // 下载图片到临时目录
                    const tempPath = await this.imageManager.downloadImage(imageUrl, `${this.platformName}_${Date.now()}_${i}`);
                    
                    // 上传图片
                    await this.uploadSingleImage(page, tempPath, i);
                    
                    // 删除临时文件
                    this.imageManager.deleteTempFile(tempPath);
                    
                    logger.info(`第 ${i + 1} 张图片上传成功`);
                    break; // 成功则跳出重试循环
                    
                } catch (error) {
                    retryCount++;
                    logger.error(`处理图片 ${imageUrl} 时出错 (尝试 ${retryCount}/${maxRetries}):`, error.message);
                    
                    if (retryCount >= maxRetries) {
                        logger.error(`图片 ${imageUrl} 上传失败，已达到最大重试次数`);
                        throw error;
                    } else {
                        logger.info(`等待 ${retryCount * 2} 秒后重试...`);
                        await this.pageOperator.delay(retryCount * 2000);
                    }
                }
            }
            
            // 图片间间隔
            if (i < images.length - 1) {
                await this.pageOperator.delay(2000);
            }
        }
        
        logger.info(`所有图片上传完成，共 ${images.length} 张`);
    }

    /**
     * 上传单张图片
     */
    async uploadSingleImage(page, tempPath, imageIndex) {
        try {
            // 等待页面加载完成
            await this.pageOperator.delay(2000);
            
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
                    fileInput = await page.$(selector);
                    if (fileInput) {
                        logger.info(`找到文件输入框: ${selector}`);
                        break;
                    }
                } catch (error) {
                    logger.debug(`选择器 ${selector} 未找到文件输入框`);
                }
            }
            
            if (!fileInput) {
                // 如果找不到文件输入框，尝试点击上传区域
                const uploadAreaSelectors = [
                    '.upload-area',
                    '.drag-upload',
                    '.upload-btn',
                    '.add-image',
                    '[data-testid="upload-area"]',
                    '.upload-zone'
                ];
                
                for (const selector of uploadAreaSelectors) {
                    try {
                        const uploadArea = await page.$(selector);
                        if (uploadArea) {
                            logger.info(`点击上传区域: ${selector}`);
                            await uploadArea.click();
                            await this.pageOperator.delay(1000);
                            
                            // 再次尝试查找文件输入框
                            fileInput = await page.$('input[type="file"]');
                            if (fileInput) break;
                        }
                    } catch (error) {
                        logger.debug(`上传区域 ${selector} 点击失败`);
                    }
                }
            }
            
            if (!fileInput) {
                throw new Error('未找到文件选择器，请检查页面是否已加载完成');
            }
            
            // 上传文件
            await fileInput.uploadFile(tempPath);
            logger.info(`已上传图片 ${imageIndex + 1}`);
            
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
                '.upload-complete'
            ];
            
            let uploadComplete = false;
            const maxWaitTime = 10000; // 10秒超时
            const startTime = Date.now();
            
            while (!uploadComplete && (Date.now() - startTime) < maxWaitTime) {
                for (const selector of uploadCompleteSelectors) {
                    try {
                        const element = await page.$(selector);
                        if (element) {
                            logger.info(`图片上传完成，检测到: ${selector}`);
                            uploadComplete = true;
                            break;
                        }
                    } catch (error) {
                        // 继续检查其他选择器
                    }
                }
                
                if (!uploadComplete) {
                    // 检查是否还有loading状态
                    const loadingSelectors = [
                        '.upload-loading',
                        '.loading',
                        '.spinner',
                        '[data-testid="loading"]'
                    ];
                    
                    let hasLoading = false;
                    for (const selector of loadingSelectors) {
                        try {
                            const loading = await page.$(selector);
                            if (loading) {
                                hasLoading = true;
                                break;
                            }
                        } catch (error) {
                            // 继续检查
                        }
                    }
                    
                    if (!hasLoading) {
                        // 没有loading状态，可能已经完成
                        uploadComplete = true;
                        logger.info('未检测到loading状态，假设上传完成');
                    } else {
                        await this.pageOperator.delay(500);
                    }
                }
            }
            
            if (!uploadComplete) {
                logger.warn(`图片 ${imageIndex + 1} 上传超时，但继续执行`);
            }
            
            // 额外等待确保页面稳定
            await this.pageOperator.delay(1000);
            
        } catch (error) {
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