/**
 * 发布服务类 - 统一管理发布相关逻辑
 */

import { publishToXiaohongshu } from '../platforms/xiaohongshu.js';
import { publishToDouyin, checkDouyinLoginStatus } from '../platforms/douyin.js';
import { publishToKuaishou } from '../platforms/kuaishou.js';
import { publishToWeibo } from '../platforms/weibo.js';
import { getOrCreateBrowser } from './BrowserService.js';
import { logger } from '../utils/logger.js';

/**
 * 发布服务类
 */
export class PublishService {
  
  // 登录状态缓存
  static loginStatusCache = null;
  static cacheTimestamp = 0;
  static CACHE_CONFIG = {
    enabled: true,
    duration: 5 * 60 * 1000 // 5分钟缓存
  };

  /**
   * 检查缓存是否有效
   */
  static isCacheValid() {
    if (!this.CACHE_CONFIG.enabled) {
      logger.debug('[缓存] 未启用');
      return false;
    }
    if (!this.loginStatusCache) {
      logger.debug('[缓存] 无缓存数据');
      return false;
    }
    const now = Date.now();
    const cacheAge = now - this.cacheTimestamp;
    logger.debug(`[缓存] 存在，age: ${cacheAge} ms, duration: ${this.CACHE_CONFIG.duration} ms`);
    return cacheAge < this.CACHE_CONFIG.duration;
  }

  /**
   * 清除登录状态缓存
   */
  static clearLoginStatusCache() {
    this.loginStatusCache = null;
    this.cacheTimestamp = 0;
    logger.info('登录状态缓存已清除');
  }

  /**
   * 设置缓存配置
   */
  static setCacheConfig(config) {
    Object.assign(this.CACHE_CONFIG, config);
    logger.info('缓存配置已更新:', this.CACHE_CONFIG);
  }

  /**
   * 获取缓存信息
   */
  static getCacheInfo() {
    const now = Date.now();
    const cacheAge = this.loginStatusCache ? now - this.cacheTimestamp : 0;
    
    return {
      hasCache: !!this.loginStatusCache,
      cacheAge,
      isValid: this.isCacheValid(),
      config: { ...this.CACHE_CONFIG }
    };
  }

  /**
   * 获取发布状态描述
   */
  static getPublishStatusDescription(result) {
    if (!result.success) {
      const loginStatus = result.data?.loginStatus;
      switch (loginStatus) {
        case 'not_logged_in':
          return `${result.platform}: 未登录，请先登录该平台`;
        case 'unknown':
          return `${result.platform}: 登录状态未知，请检查网络连接`;
        case 'error':
          return `${result.platform}: 登录状态检查失败 - ${result.message}`;
        default:
          return `${result.platform}: 发布失败 - ${result.message}`;
      }
    }
    return `${result.platform}: 发布成功`;
  }

  /**
   * 安全执行异步操作并返回结果
   */
  static async safeExecute(operation, errorMessage = '操作失败') {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      logger.error(`${errorMessage}:`, error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 发布到多个平台
   */
  static async publishToMultiplePlatforms(platforms, productId) {
    const results = [];
    
    try {
      // 首先获取所有平台的登录状态（使用缓存）
      logger.info('检查各平台登录状态...');
      const loginStatus = await this.checkSocialMediaLoginStatus();
      
      for (const publishInfo of platforms) {
        const platformName = publishInfo.platform;
        
        try {
          const platformLoginStatus = loginStatus[platformName];
          
          logger.info(`处理平台: ${platformName}, 登录状态:`, platformLoginStatus);
          
          // 检查登录状态
          if (!platformLoginStatus) {
            logger.info(`${platformName}: 未找到登录状态信息`);
            results.push({
              platform: platformName,
              success: false,
              message: '登录状态未知，无法发布',
              data: { loginStatus: 'unknown' }
            });
            continue;
          }
          
          if (platformLoginStatus.status === 'error') {
            logger.info(`${platformName}: 登录状态检查失败`);
            results.push({
              platform: platformName,
              success: false,
              message: `登录状态检查失败: ${platformLoginStatus.message}`,
              data: { loginStatus: 'error', error: platformLoginStatus.message }
            });
            continue;
          }
          
          if (!platformLoginStatus.isLoggedIn) {
            logger.info(`${platformName}: 未登录，跳过发布`);
            results.push({
              platform: platformName,
              success: false,
              message: '未登录，无法发布内容',
              data: { loginStatus: 'not_logged_in' }
            });
            continue;
          }
          
          // 已登录，开始发布
          logger.info(`开始发布到平台: ${platformName}`);
          
          let result;
          try {
            switch (platformName) {
              case 'douyin':
                result = await publishToDouyin(publishInfo);
                break;
              case 'xiaohongshu':
                result = await publishToXiaohongshu(publishInfo);
                break;
              case 'kuaishou':
                result = await publishToKuaishou(publishInfo);
                break;
              case 'weibo':
                result = await publishToWeibo(publishInfo);
                break;
              default:
                result = {
                  success: false,
                  error: `不支持的平台: ${platformName}`
                };
            }
          } catch (publishError) {
            logger.error(`${platformName} 发布过程出错:`, publishError);
            result = {
              success: false,
              error: publishError instanceof Error ? publishError.message : '发布过程出错'
            };
          }
          
          const publishResult = {
            platform: platformName,
            success: result?.success || false,
            message: result.message || result.error || '发布完成',
            data: {
              ...result.data,
              loginStatus: 'logged_in',
              publishResult: result
            }
          };
          
          results.push(publishResult);
          logger.info(`${platformName} 发布结果:`, publishResult);
          
        } catch (platformError) {
          logger.error(`${platformName} 处理失败:`, platformError);
          results.push({
            platform: platformName,
            success: false,
            message: platformError instanceof Error ? platformError.message : '平台处理失败',
            data: {
              loginStatus: 'unknown',
              error: platformError instanceof Error ? platformError.message : '平台处理过程出错'
            }
          });
        }
      }
      
    } catch (overallError) {
      logger.error('多平台发布整体过程出错:', overallError);
      // 如果整体过程出错，为所有平台返回错误状态
      for (const publishInfo of platforms) {
        results.push({
          platform: publishInfo.platform,
          success: false,
          message: overallError instanceof Error ? overallError.message : '发布服务异常',
          data: {
            loginStatus: 'unknown',
            error: overallError instanceof Error ? overallError.message : '发布服务整体异常'
          }
        });
      }
    }
    
    logger.info('多平台发布完成，结果汇总:', results);
    return results;
  }

  /**
   * 检查社交媒体登录状态
   */
  static async checkSocialMediaLoginStatus(forceRefresh = false) {
    logger.info('[登录状态] checkSocialMediaLoginStatus called, forceRefresh:', forceRefresh);
    let loginStatus = {};
    
    try {
      // 检查缓存是否有效
      if (!forceRefresh && this.isCacheValid()) {
        logger.info('[登录状态] 使用缓存的登录状态数据', this.loginStatusCache, '缓存时间戳:', this.cacheTimestamp);
        return this.loginStatusCache;
      }
      
      logger.info('[登录状态] 开始检查登录状态，缓存已失效或强制刷新');
      
      // 支持多个平台，初始化所有平台的状态
      const platformConfigs = [
        {
          name: 'xiaohongshu',
          url: 'https://creator.xiaohongshu.com/publish/publish?target=image',
          selectors: {
            userElements: ['.user_avatar', '.reds-avatar-border', '.user-avatar', '.creator-header'],
            loginElements: ['.login', 'button[data-testid="login-button"]', '.login-btn', '.login-text']
          }
        },
        {
          name: 'douyin',
          url: 'https://creator.douyin.com/creator-micro/content/upload',
          selectors: {
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
          }
        },
        {
          name: 'kuaishou',
          url: 'https://cp.kuaishou.com/article/publish/video',
          selectors: {
            userElements: ['.user-info', '.user-avatar', '.header-user'],
            loginElements: ['.login-btn', '.login-button', '.login-entry']
          }
        },
        {
          name: 'weibo',
          url: 'https://weibo.com',
          selectors: {
            userElements: ['[class*="Ctrls_avatarItem_"]'],
            loginElements: ['.login-btn', '.login-text', '.login-button']
          }
        }
      ];

      // 初始化所有平台的返回结构
      loginStatus = {};
      for (const config of platformConfigs) {
        loginStatus[config.name] = { 
          isLoggedIn: false, 
          status: 'unknown', 
          message: '',
          timestamp: Date.now()
        };
      }

      let browser;
      try {
        browser = await getOrCreateBrowser();
      } catch (browserError) {
        logger.error('获取浏览器实例失败:', browserError);
        // 如果浏览器获取失败，为所有平台返回错误状态
        for (const config of platformConfigs) {
          loginStatus[config.name] = {
            isLoggedIn: false,
            status: 'error',
            message: browserError instanceof Error ? browserError.message : '浏览器初始化失败',
            timestamp: Date.now()
          };
        }
        // 赋值缓存
        this.loginStatusCache = loginStatus;
        this.cacheTimestamp = Date.now();
        logger.info('[缓存] 浏览器获取失败已更新', this.loginStatusCache, '时间戳:', this.cacheTimestamp);
        return loginStatus;
      }

      const pages = [];

      logger.info(`开始检查 ${platformConfigs.length} 个平台的登录状态...`);

      const checkPromises = platformConfigs.map(async (config) => {
        let page = null;
        try {
          logger.info(`正在处理平台: ${config.name}`);
          
          try {
            page = await browser.newPage();
          } catch (pageError) {
            logger.error(`${config.name} 创建页面失败:`, pageError);
            loginStatus[config.name] = {
              isLoggedIn: false,
              status: 'error',
              message: pageError instanceof Error ? pageError.message : '页面创建失败',
              timestamp: Date.now()
            };
            return;
          }
          
          pages.push(page);
          page.setDefaultTimeout(30000);
          page.setDefaultNavigationTimeout(30000);

          logger.info(`正在访问 ${config.name} 的URL: ${config.url}`);

          try {
            await page.goto(config.url, {
              waitUntil: 'domcontentloaded',
              timeout: 30000
            });
            logger.info(`${config.name} 页面加载成功`);
          } catch (navigationError) {
            logger.error(`${config.name} 页面加载失败:`, navigationError);
            loginStatus[config.name] = {
              isLoggedIn: false,
              status: 'error',
              message: navigationError instanceof Error ? navigationError.message : '页面加载失败',
              timestamp: Date.now()
            };
            return;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));

          let pageTitle, currentUrl;
          try {
            pageTitle = await page.title();
            currentUrl = page.url();
            logger.info(`${config.name} 页面标题:`, pageTitle);
            logger.info(`${config.name} 当前URL:`, currentUrl);
          } catch (infoError) {
            logger.error(`${config.name} 获取页面信息失败:`, infoError);
            // 继续执行，不影响登录状态检查
          }

          logger.info(`开始检查 ${config.name} 的登录状态...`);

          let isLoggedIn = false;
          let loginDetails = null;
          
          // 为抖音使用专门的检测方法
          if (config.name === 'douyin') {
            try {
              const douyinResult = await checkDouyinLoginStatus(page);
              isLoggedIn = douyinResult.isLoggedIn;
              loginDetails = douyinResult.details;
              logger.info('抖音登录检测详情:', loginDetails);
            } catch (douyinError) {
              logger.error('抖音专门检测失败:', douyinError);
              loginStatus[config.name] = {
                isLoggedIn: false,
                status: 'error',
                message: douyinError instanceof Error ? douyinError.message : '抖音登录检测失败',
                timestamp: Date.now()
              };
              return;
            }
          } else {
            // 其他平台使用通用检测方法
            try {
              isLoggedIn = await page.evaluate((selectors) => {
                try {
                  if (!selectors || !selectors.userElements || !selectors.loginElements) {
                    return false;
                  }
                  const hasUserElement = selectors.userElements.some(selector => {
                    try {
                      const element = document.querySelector(selector);
                      return !!element;
                    } catch {
                      return false;
                    }
                  });
                  const hasLoginElement = selectors.loginElements.some(selector => {
                    try {
                      const element = document.querySelector(selector);
                      return !!element;
                    } catch {
                      return false;
                    }
                  });
                  return hasUserElement && !hasLoginElement;
                } catch {
                  return false;
                }
              }, config.selectors);
            } catch (evaluateError) {
              logger.error(`${config.name} 登录状态检查失败:`, evaluateError);
              loginStatus[config.name] = {
                isLoggedIn: false,
                status: 'error',
                message: evaluateError instanceof Error ? evaluateError.message : '登录状态检查失败',
                timestamp: Date.now()
              };
              return;
            }
          }

          logger.info(`${config.name} 登录状态检查结果:`, isLoggedIn);
          
          // 根据检测结果设置详细消息
          let statusMessage = isLoggedIn ? '已登录' : '未登录';
          if (config.name === 'douyin' && loginDetails) {
            if (loginDetails.reason === 'redirected_to_login_page') {
              statusMessage = '被重定向到登录页面';
            } else if (loginDetails.reason === 'detection_error') {
              statusMessage = '检测过程出错';
            } else if (isLoggedIn) {
              if (loginDetails.hasHeaderAvatar) {
                statusMessage = '已登录 (检测到头像元素)';
              } else {
                statusMessage = '已登录 (检测到用户元素)';
              }
            } else {
              if (loginDetails.hasLoginElement) {
                statusMessage = '未登录 (检测到登录按钮)';
              } else {
                statusMessage = '未登录 (未检测到用户元素)';
              }
            }
          }
          
          loginStatus[config.name] = {
            isLoggedIn,
            status: 'success',
            message: statusMessage,
            timestamp: Date.now(),
            details: config.name === 'douyin' ? loginDetails : undefined
          };
          logger.info(`${config.name} 检查完成`);
          
        } catch (error) {
          logger.error(`${config.name} 检查失败:`, error);
          loginStatus[config.name] = {
            isLoggedIn: false,
            status: 'error',
            message: error instanceof Error ? error.message : '检查失败',
            timestamp: Date.now()
          };
        } finally {
          if (page) {
            try {
              await page.close();
              logger.info(`${config.name} 页面已关闭`);
            } catch (closeError) {
              logger.info(`${config.name} 关闭页面时出错:`, closeError);
            }
          }
        }
      });

      logger.info('等待所有平台检查完成...');
      await Promise.all(checkPromises);
      logger.info('所有平台检查完成，返回结果');
      
      // 更新缓存
      this.loginStatusCache = loginStatus;
      this.cacheTimestamp = Date.now();
      logger.info('[缓存] 已更新', this.loginStatusCache, '时间戳:', this.cacheTimestamp);
      return loginStatus;
      
    } catch (overallError) {
      logger.error('登录状态检查整体过程出错:', overallError);
      // 如果整体过程出错，返回所有平台的错误状态
      const errorLoginStatus = {};
      const platformNames = ['xiaohongshu', 'douyin', 'kuaishou', 'weibo'];
      for (const platformName of platformNames) {
        errorLoginStatus[platformName] = {
          isLoggedIn: false,
          status: 'error',
          message: overallError instanceof Error ? overallError.message : '登录状态检查服务异常',
          timestamp: Date.now()
        };
      }
      // catch分支也赋值缓存
      this.loginStatusCache = errorLoginStatus;
      this.cacheTimestamp = Date.now();
      logger.info('[缓存] catch分支已更新', this.loginStatusCache, '时间戳:', this.cacheTimestamp);
      return errorLoginStatus;
    }
  }
}
