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
      submitButton: '[class^="Tool_check_"] button'
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
      titleInput: 'input[placeholder*="标题"]',
      contentInput: '.ql-editor',
      fileInput: 'input[type="file"]',
      submitButton: '.submit button'
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
      // 点击进入第3个tab
      await page.waitForSelector('.header .creator-tab:nth-of-type(3)');
      await page.evaluate(() => {
        const el = document.querySelector('.header .creator-tab:nth-of-type(3)');
        if (el) el.click();
      });
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
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
