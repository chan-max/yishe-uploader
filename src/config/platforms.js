/**
 * 平台配置
 */

export const PLATFORM_CONFIGS = {
  weibo: {
    name: '微博',
    uploadUrl: 'https://weibo.com',
    selectors: {
      contentInput: 'textarea[class^="Form_input_"]',
      fileInput: 'input[type="file"]',
      submitButton: '[class^="Tool_check_"] button'
    }
  },
  douyin: {
    name: '抖音',
    uploadUrl: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
    selectors: {
      titleInput: 'input[placeholder*="标题"]',
      contentInput: '.editor-kit-container',
      fileInput: 'input[type="file"]',
      submitButton: 'button.button-dhlUZE.primary-cECiOJ.fixed-J9O8Yw'
    }
  },
  xiaohongshu: {
    name: '小红书',
    uploadUrl: 'https://creator.xiaohongshu.com/publish/publish?target=image',
    selectors: {
      titleInput: 'input[placeholder*="标题"]',
      contentInput: '.ql-editor',
      fileInput: 'input[type="file"]',
      submitButton: '.submit button'
    }
  },
  kuaishou: {
    name: '快手',
    uploadUrl: 'https://cp.kuaishou.com/article/publish/video?tabType=2',
    selectors: {
      contentInput: '#work-description-edit',
      fileInput: 'input[type="file"]',
      submitButton: 'div[class^="_section-form-btns_"] > div:first-child'
    }
  },
  
};

export const SOCIAL_MEDIA_UPLOAD_URLS = {
  xiaohongshu_pic: 'https://creator.xiaohongshu.com/publish/publish?target=image',
  douyin_pic: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
  kuaishou_pic: 'https://cp.kuaishou.com/article/publish/video?tabType=2',
  weibo: 'https://weibo.com'
};
