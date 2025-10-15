/**
 * 常量配置
 */

export const DEFAULT_CONFIG = {
  // 浏览器配置
  browser: {
    headless: false,
    userDataDir: process.platform === 'win32' 
      ? 'C:\\temp\\puppeteer-user-data'
      : '/tmp/puppeteer-user-data',
    timeout: 30000,
    viewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    }
  },
  
  // 网络配置
  network: {
    checkInterval: 30000,    // 30秒检查一次
    timeout: 10000,         // 10秒超时
    maxFailures: 3,         // 最多3次连续失败
    recoveryDelay: 5000     // 5秒恢复延迟
  },
  
  // 重试配置
  retry: {
    maxRetries: 3,
    retryDelay: 2000,
    backoffMultiplier: 1.5
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    duration: 5 * 60 * 1000 // 5分钟缓存
  }
};

export const SUPPORTED_PLATFORMS = [
  'weibo',
  'douyin', 
  'xiaohongshu',
  'kuaishou'
];

export const PLATFORM_NAMES = {
  weibo: '微博',
  douyin: '抖音',
  xiaohongshu: '小红书',
  kuaishou: '快手'
};
