/**
 * 平台配置 - 统一管理所有平台的配置信息
 */

export const PLATFORM_CONFIGS = {
    weibo: {
        name: '微博',
        uploadUrl: 'https://weibo.com',
        waitUntil: 'domcontentloaded',
        timeout: 30000,
        antiDetection: false,
        checkLogin: false,
        selectors: {
            contentInput: 'textarea[class^="Form_input_"]',
            fileInput: 'input[type="file"]',
            submitButton: '[class*="Tool_check_"] button, [class*="send_"] button, button[role="button"]:has-text("发布"), button:has-text("发送"), .tool-bar button[role="button"]'
        },
        loginSelectors: {
            userElements: ['[class*="Ctrls_avatarItem_"]'],
            loginElements: ['.login-btn', '.login-text', '.login-button']
        },
        preProcess: null,
        postProcess: null
    },
    douyin: {
        name: '抖音',
        uploadUrl: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
        waitUntil: 'domcontentloaded',
        timeout: 30000,
        antiDetection: false,
        checkLogin: true,
        selectors: {
            titleInput: 'input[placeholder*="标题"]',
            contentInput: '.editor-kit-container',
            fileInput: 'input[type="file"]',
            submitButton: 'button.button-dhlUZE.primary-cECiOJ.fixed-J9O8Yw'
        },
        loginSelectors: {
            userElements: [
                '#header-avatar',
                '.user-avatar',
                '.user-info',
                '.header-user',
                '[data-testid="user-avatar"]',
                '.creator-header'
            ],
            loginElements: [
                '.login-btn',
                '.login-button',
                '.login-entry',
                'button[data-testid="login-button"]',
                '.login-text',
                '.login-link',
                '.login-prompt',
                '[class*="login"]',
                '.auth-btn',
                '.sign-in-btn'
            ]
        },
        preProcess: null,
        postProcess: null
    },
    xiaohongshu: {
        name: '小红书',
        uploadUrl: 'https://creator.xiaohongshu.com/publish/publish?target=image',
        waitUntil: 'networkidle2',
        timeout: 30000,
        antiDetection: true,
        checkLogin: true,
        selectors: {
            titleInput: 'input[placeholder*="标题"], input[placeholder*="笔记标题"], .title-input, [data-testid="title-input"], input[type="text"][placeholder*="标题"], input.ant-input',
            contentInput: '.tiptap.ProseMirror, .ql-editor, .content-editor, [data-testid="content-editor"]',
            fileInput: 'input[type="file"]',
            submitButton: '.submit button, .publish-btn, [data-testid="publish-btn"], button[type="button"]:has-text("发布")'
        },
        loginSelectors: {
            userElements: [
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
            ],
            loginElements: [
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
            ]
        },
        preProcess: async (page) => {
            try {
                // 等待页面稳定
                await page.waitForTimeout(2000);

                // 检查当前URL，如果已经在正确的页面就不需要切换tab
                const currentUrl = page.url();
                console.log('当前URL:', currentUrl);

                // 如果URL中已经包含 target=image，说明已经在图片发布页面
                if (currentUrl.includes('target=image')) {
                    console.log('已在图片发布页面，跳过tab切换');
                    return;
                }

                // 尝试点击进入图片tab
                try {
                    // 等待tab元素出现
                    await page.waitForSelector('.header .creator-tab, .creator-tab', {
                        timeout: 3000
                    });

                    // 查找并点击图片相关的tab
                    const tabs = await page.$$('.header .creator-tab, .creator-tab');
                    console.log(`找到 ${tabs.length} 个tab`);

                    // 尝试点击第3个tab（通常是图片）
                    if (tabs.length >= 3) {
                        const imageTab = tabs[2]; // 第3个tab (索引从0开始)
                        const tabText = await imageTab.evaluate(el => el.textContent || el.innerText);
                        console.log(`准备点击tab: ${tabText}`);

                        // 使用 ElementHandle.click() 方法点击
                        await imageTab.click({
                            delay: 100
                        });
                        console.log('已点击图片tab');

                        // 等待页面变化
                        await page.waitForTimeout(2000);
                    }
                } catch (tabError) {
                    console.log('点击tab失败，可能已在正确页面:', tabError.message);
                }
            } catch (error) {
                console.warn('preProcess 执行失败，继续流程:', error.message);
                // 不要抛出错误，让流程继续
            }
        },
        postProcess: null
    },
    kuaishou: {
        name: '快手',
        uploadUrl: 'https://cp.kuaishou.com/article/publish/video?tabType=2',
        waitUntil: 'domcontentloaded',
        timeout: 30000,
        antiDetection: false,
        checkLogin: false,
        selectors: {
            contentInput: '#work-description-edit',
            fileInput: 'input[type="file"]',
            submitButton: 'div[class^="_section-form-btns_"] > div:first-child'
        },
        loginSelectors: {
            userElements: ['.user-info', '.user-avatar', '.header-user'],
            loginElements: ['.login-btn', '.login-button', '.login-entry']
        },
        preProcess: null,
        postProcess: null
    }
};

// 保持向后兼容
export const SOCIAL_MEDIA_UPLOAD_URLS = {
    xiaohongshu_pic: PLATFORM_CONFIGS.xiaohongshu.uploadUrl,
    douyin_pic: PLATFORM_CONFIGS.douyin.uploadUrl,
    kuaishou_pic: PLATFORM_CONFIGS.kuaishou.uploadUrl,
    weibo: PLATFORM_CONFIGS.weibo.uploadUrl
};