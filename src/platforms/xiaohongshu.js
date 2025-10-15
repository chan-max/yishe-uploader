/**
 * 小红书发布功能
 */

import {
    getOrCreateBrowser,
    setupAntiDetection
} from '../services/BrowserService.js';
import {
    downloadImageToTemp,
    deleteTempFile
} from '../utils/fileUtils.js';
import {
    SOCIAL_MEDIA_UPLOAD_URLS
} from '../config/platforms.js';
import {
    logger
} from '../utils/logger.js';

/**
 * 发布到小红书
 */
export async function publishToXiaohongshu(publishInfo) {
    try {
        logger.info('开始执行小红书发布操作，参数:', publishInfo);
        const browser = await getOrCreateBrowser();
        const page = await browser.newPage();
        logger.info('新页面创建成功');

        // 应用反检测脚本
        await setupAntiDetection(page);
        logger.info('反检测脚本已应用');

        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

        await page.goto(SOCIAL_MEDIA_UPLOAD_URLS.xiaohongshu_pic, {
            waitUntil: 'networkidle2'
        });
        logger.info('已打开小红书发布页面');

        // 新增：点击进入第3个tab
        await page.waitForSelector('.header .creator-tab:nth-of-type(3)');
        await page.evaluate(() => {
            const el = document.querySelector('.header .creator-tab:nth-of-type(3)');
            if (el) el.click();
        });
        logger.info('已点击第3个tab');

        // 等待tab切换完成
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

        // 等待文件选择器出现
        await page.waitForSelector('input[type="file"]');
        logger.info('找到文件选择器');

        if (publishInfo.images && Array.isArray(publishInfo.images)) {
            for (const imageUrl of publishInfo.images) {
                try {
                    // 下载图片到临时目录
                    const tempPath = await downloadImageToTemp(imageUrl, `xiaohongshu_${Date.now()}`);

                    // 关键：每次都重新获取 input[type="file"]
                    const fileInput = await page.$('input[type="file"]');
                    if (!fileInput) {
                        throw new Error('未找到文件选择器');
                    }

                    await fileInput.uploadFile(tempPath);
                    logger.info('已上传图片:', imageUrl);

                    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 999)));

                    deleteTempFile(tempPath);
                } catch (error) {
                    logger.error(`处理图片 ${imageUrl} 时出错:`, error);
                    throw error;
                }
            }
        }

        // 等待图片上传完成
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

        // 填写标题
        const titleSelector = 'input[placeholder*="标题"]';
        await page.waitForSelector(titleSelector);

        // 模拟真实用户输入行为
        await page.type(titleSelector, publishInfo.title || '', {
            delay: 100
        });
        logger.info('已填写标题');

        // 填写正文内容
        const contentSelector = '.ql-editor';
        await page.waitForSelector(contentSelector);

        // 模拟真实用户输入行为
        await page.type(contentSelector, publishInfo.content || '', {
            delay: 50
        });
        logger.info('已填写正文内容');

        // 等待内容填写完成
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

        // 点击发布按钮
        const submitButton = await page.waitForSelector('.submit button');
        if (!submitButton) {
            throw new Error('未找到发布按钮');
        }

        // 模拟真实用户点击行为
        await submitButton.hover();
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
        await submitButton.click();
        logger.info('已点击发布按钮');

        // 等待发布完成
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

        // 发布成功，返回结果
        return {
            success: true,
            message: '发布成功'
        };
    } catch (error) {
        logger.error('小红书发布过程出错:', error);
        return {
            success: false,
            message: error ? error.message : '未知错误',
            data: error
        };
    }
}

/**
 * 专门检测小红书登录状态的方法
 */
export async function checkXiaohongshuLoginStatus(page) {
    try {
        // 等待页面完全加载
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 获取当前URL，检查是否被重定向到登录页面
        const currentUrl = page.url();
        logger.info('小红书当前URL:', currentUrl);

        // 检查是否在登录页面
        const isOnLoginPage = currentUrl.includes('login') ||
            currentUrl.includes('auth') ||
            currentUrl.includes('signin') ||
            currentUrl.includes('passport') ||
            currentUrl.includes('signup');

        if (isOnLoginPage) {
            logger.info('检测到在登录页面，未登录');
            return {
                isLoggedIn: false,
                details: {
                    reason: 'redirected_to_login_page',
                    currentUrl: currentUrl
                }
            };
        }

        // 执行页面内的登录状态检测
        const loginStatus = await page.evaluate(() => {
            // 检查用户相关元素 - 重点检测 class="user_avatar"
            const userElements = [
                '.user_avatar',
                '[class="user_avatar"]',
                '.reds-avatar-border',
                '.user-avatar',
                '.creator-header',
                '.header-avatar',
                '.user-info',
                '.user-profile',
                '[data-testid="user-avatar"]',
                '.avatar-container',
                '.user-container',
                '.user-menu',
                '.profile-avatar'
            ];

            // 检查登录相关元素
            const loginElements = [
                '.login',
                'button[data-testid="login-button"]',
                '.login-btn',
                '.login-text',
                '.login-button',
                '.login-entry',
                '.auth-btn',
                '.sign-in-btn',
                '[class*="login"]',
                '.login-prompt',
                '.login-link',
                '.sign-up-btn',
                '.register-btn'
            ];

            // 查找用户元素
            const foundUserElements = [];
            let hasUserElement = false;
            let hasUserAvatar = false;

            userElements.forEach(selector => {
                try {
                    const element = document.querySelector(selector);
                    if (element) {
                        foundUserElements.push(selector);
                        hasUserElement = true;
                        // 特别检查 class="user_avatar"
                        if (selector === '.user_avatar' || selector === '[class="user_avatar"]') {
                            hasUserAvatar = true;
                        }
                    }
                } catch (e) {
                    // 忽略无效选择器
                }
            });

            // 查找登录元素
            const foundLoginElements = [];
            let hasLoginElement = false;
            loginElements.forEach(selector => {
                try {
                    const element = document.querySelector(selector);
                    if (element) {
                        foundLoginElements.push(selector);
                        hasLoginElement = true;
                    }
                } catch (e) {
                    // 忽略无效选择器
                }
            });

            // 判断登录状态：有用户元素且没有登录元素
            const isLoggedIn = hasUserElement && !hasLoginElement;

            const details = {
                userElementsFound: foundUserElements,
                loginElementsFound: foundLoginElements,
                pageTitle: document.title,
                currentUrl: window.location.href,
                hasUserElement,
                hasLoginElement,
                hasUserAvatar,
                hasUserRelatedText: false
            };

            return {
                isLoggedIn,
                details
            };
        });

        logger.info('小红书登录状态检测结果:', loginStatus);
        return loginStatus;

    } catch (error) {
        logger.error('小红书登录状态检测失败:', error);
        return {
            isLoggedIn: false,
            details: {
                error: error instanceof Error ? error.message : '检测失败',
                reason: 'detection_error'
            }
        };
    }
}