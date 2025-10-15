/**
 * 浏览器服务 - 管理 Puppeteer 浏览器实例
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { join as pathJoin } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { logger } from '../utils/logger.js';

// 使用 stealth 插件
puppeteer.use(StealthPlugin());

// 全局浏览器实例
let browserInstance = null;

/**
 * 获取或创建浏览器实例
 */
export async function getOrCreateBrowser() {
  // 检查现有浏览器实例
  if (browserInstance) {
    try {
      // 简单检查浏览器是否仍然连接
      const pages = await browserInstance.pages();
      logger.info('浏览器已存在且连接正常，页面数量:', pages.length);
      return browserInstance;
    } catch (error) {
      logger.warn('浏览器连接已断开，重新启动...');
      browserInstance = null;
    }
  }

  // 创建新的浏览器实例
  logger.info('启动新的浏览器实例...');
  
  try {
    // 设置用户数据目录，用于保存登录信息
    const userDataDir = process.platform === 'win32' 
      ? 'C:\\temp\\puppeteer-user-data'
      : '/tmp/puppeteer-user-data';
    
    browserInstance = await puppeteer.launch({
      headless: false, // 设置为false以显示浏览器窗口
      defaultViewport: null, // 使用默认视口大小
      userDataDir: userDataDir, // 保存用户数据，包括登录信息
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled', // 隐藏自动化标识
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions-except',
        '--disable-plugins-discovery',
        '--disable-default-apps',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-domain-reliability',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-report-upload'
      ]
    });

    logger.info('新浏览器实例启动成功，用户数据目录:', userDataDir);
    return browserInstance;
    
  } catch (error) {
    logger.error('浏览器启动失败:', error);
    throw error;
  }
}

/**
 * 为页面添加反检测脚本
 */
export async function setupAntiDetection(page) {
  // 设置更真实的 user-agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // 注入反检测脚本
  await page.evaluateOnNewDocument(() => {
    // 更彻底的 webdriver 伪装
    // 方法1: 删除原型链上的 webdriver 属性
    delete navigator.__proto__.webdriver;
    
    // 方法2: 使用 Object.defineProperty 重新定义
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: true,
      enumerable: false
    });
    
    // 方法3: 确保在 navigator 对象上也不存在
    if ('webdriver' in navigator) {
      delete navigator.webdriver;
    }
    
    // 方法4: 使用 Proxy 来拦截所有访问
    const originalNavigator = navigator;
    const navigatorProxy = new Proxy(originalNavigator, {
      get: function(target, prop) {
        if (prop === 'webdriver') {
          return false;
        }
        return target[prop];
      },
      has: function(target, prop) {
        if (prop === 'webdriver') {
          return false;
        }
        return prop in target;
      }
    });
    
    // 尝试替换全局 navigator
    try {
      Object.defineProperty(window, 'navigator', {
        value: navigatorProxy,
        writable: false,
        configurable: false
      });
    } catch (e) {
      // 如果无法替换，至少确保 webdriver 返回 false
      console.log('无法替换全局 navigator，使用备用方案');
    }

    // 伪装插件
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // 伪装语言
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en'],
    });

    // 伪装平台
    Object.defineProperty(navigator, 'platform', {
      get: () => 'MacIntel',
    });

    // 伪装硬件并发数
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });

    // 伪装设备内存
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });

    // 伪装连接
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
      }),
    });

    // 伪装 Chrome 运行时
    window.chrome = {
      runtime: {},
    };

    // 伪装 WebGL
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      if (parameter === 37446) {
        return 'Intel(R) Iris(TM) Graphics 6100';
      }
      return getParameter.call(this, parameter);
    };

    // 伪装 Canvas
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const context = originalGetContext.call(this, type, ...args);
      if (type === '2d') {
        const originalFillText = context.fillText;
        context.fillText = function(...args) {
          return originalFillText.apply(this, args);
        };
      }
      return context;
    };

    // 伪装 AudioContext
    const originalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (originalAudioContext) {
      window.AudioContext = originalAudioContext;
      window.webkitAudioContext = originalAudioContext;
    }

    // 伪装 MediaDevices
    if (navigator.mediaDevices) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = function(constraints) {
        return Promise.reject(new Error('Not allowed'));
      };
    }

    // 伪装 Battery API
    if ('getBattery' in navigator) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: Infinity,
        dischargingTime: Infinity,
        level: 1,
      });
    }

    // 伪装 Notification
    if ('Notification' in window) {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'granted',
      });
    }

    // 伪装 ServiceWorker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = () => Promise.resolve({
        scope: '',
        updateViaCache: 'all',
        scriptURL: '',
        state: 'activated',
        unregister: () => Promise.resolve(true),
        update: () => Promise.resolve(),
      });
    }

    // 伪装 WebDriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // 伪装 Automation
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        ...navigator,
        webdriver: false,
      },
    });

    // 伪装 Chrome 对象
    window.chrome = {
      app: {
        isInstalled: false,
        InstallState: {
          DISABLED: 'disabled',
          INSTALLED: 'installed',
          NOT_INSTALLED: 'not_installed',
        },
        RunningState: {
          CANNOT_RUN: 'cannot_run',
          READY_TO_RUN: 'ready_to_run',
          RUNNING: 'running',
        },
      },
      runtime: {
        OnInstalledReason: {
          CHROME_UPDATE: 'chrome_update',
          INSTALL: 'install',
          SHARED_MODULE_UPDATE: 'shared_module_update',
          UPDATE: 'update',
        },
        OnRestartRequiredReason: {
          APP_UPDATE: 'app_update',
          OS_UPDATE: 'os_update',
          PERIODIC: 'periodic',
        },
        PlatformArch: {
          ARM: 'arm',
          ARM64: 'arm64',
          MIPS: 'mips',
          MIPS64: 'mips64',
          X86_32: 'x86-32',
          X86_64: 'x86-64',
        },
        PlatformNaclArch: {
          ARM: 'arm',
          MIPS: 'mips',
          MIPS64: 'mips64',
          X86_32: 'x86-32',
          X86_64: 'x86-64',
        },
        PlatformOs: {
          ANDROID: 'android',
          CROS: 'cros',
          LINUX: 'linux',
          MAC: 'mac',
          OPENBSD: 'openbsd',
          WIN: 'win',
        },
        RequestUpdateCheckStatus: {
          NO_UPDATE: 'no_update',
          THROTTLED: 'throttled',
          UPDATE_AVAILABLE: 'update_available',
        },
      },
    };
  });

  // 设置视口大小
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  // 设置额外的请求头
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  });
}

/**
 * 关闭浏览器实例
 */
export async function closeBrowser() {
  try {
    if (browserInstance) {
      try {
        await browserInstance.close();
        logger.info('浏览器实例已关闭');
      } catch (error) {
        logger.error('关闭浏览器实例时出错:', error);
      } finally {
        browserInstance = null;
      }
    }
  } catch (error) {
    logger.error('清理浏览器资源时出错:', error);
  }
}

/**
 * 清除用户数据
 */
export async function clearUserData() {
  try {
    // 先关闭浏览器
    await closeBrowser();
    
    // 设置用户数据目录路径
    const userDataDir = process.platform === 'win32' 
      ? 'C:\\temp\\puppeteer-user-data'
      : '/tmp/puppeteer-user-data';
    
    // 删除用户数据目录
    if (existsSync(userDataDir)) {
      rmSync(userDataDir, { recursive: true, force: true });
      logger.info('用户数据目录已删除:', userDataDir);
    }
    
    return { success: true, userDataDir };
  } catch (error) {
    logger.error('清除用户数据失败:', error);
    throw error;
  }
}

/**
 * 获取浏览器状态
 */
export async function getBrowserStatus() {
  try {
    if (browserInstance) {
      const pages = await browserInstance.pages();
      return {
        connected: true,
        pageCount: pages.length,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        connected: false,
        pageCount: 0,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    logger.error('查询浏览器状态失败:', error);
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 清理资源
 */
export async function cleanup() {
  await closeBrowser();
}

// 导出默认的浏览器服务类
export class BrowserService {
  static async getOrCreateBrowser() {
    return getOrCreateBrowser();
  }

  static async setupAntiDetection(page) {
    return setupAntiDetection(page);
  }

  static async close() {
    return closeBrowser();
  }

  static async clearUserData() {
    return clearUserData();
  }

  static async getStatus() {
    return getBrowserStatus();
  }

  static async cleanup() {
    return cleanup();
  }
}
