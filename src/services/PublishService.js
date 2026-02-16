/**
 * 发布服务类 - 统一管理发布相关逻辑
 */

import {
    publishToXiaohongshu
} from '../platforms/xiaohongshu.js';
import {
    publishToDouyin
} from '../platforms/douyin.js';
import {
    publishToKuaishou
} from '../platforms/kuaishou.js';
import {
    publishToWeibo
} from '../platforms/weibo.js';
import {
    publishToYouTube
} from '../platforms/youtube.js';
import {
    publishToXianyu
} from '../platforms/xianyu.js';
import {
    getOrCreateBrowser,
    isBrowserAvailable,
    updateBrowserActivity
} from './BrowserService.js';
import {
    DouyinLoginChecker,
    XiaohongshuLoginChecker,
    GenericLoginChecker
} from './LoginChecker.js';
import {
    PLATFORM_CONFIGS
} from '../config/platforms.js';
import {
    logger
} from '../utils/logger.js';

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
            config: {
                ...this.CACHE_CONFIG
            }
        };
    }

    /**
     * 获取发布状态描述
     */
    static getPublishStatusDescription(result) {
        if (!result.success) {
            const loginStatus = result.data ? result.data.loginStatus : 'unknown';
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
            return {
                success: true,
                data: result
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : errorMessage;
            logger.error(`${errorMessage}:`, error);
            return {
                success: false,
                error: errorMsg
            };
        }
    }

    /**
     * 发布单个平台
     */
    static async publishSingle(publishInfo) {
        const platformName = publishInfo.platform;
        try {
            let result;
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
                case 'youtube':
                    result = await publishToYouTube(publishInfo);
                    break;
                case 'xianyu':
                    result = await publishToXianyu(publishInfo);
                    break;
                default:
                    result = {
                        success: false,
                        message: `不支持的平台: ${platformName}`
                    };
            }

            return {
                platform: platformName,
                success: result ? result.success : false,
                message: result.message || result.error || '发布完成',
                data: {
                    ...result.data,
                    publishResult: result
                }
            };
        } catch (error) {
            logger.error(`${platformName} 发布失败:`, error);
            return {
                platform: platformName,
                success: false,
                message: error instanceof Error ? error.message : '发布失败',
                data: {}
            };
        }
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
                    checker: new XiaohongshuLoginChecker(),
                    config: PLATFORM_CONFIGS.xiaohongshu
                },
                {
                    name: 'douyin',
                    checker: new DouyinLoginChecker(),
                    config: PLATFORM_CONFIGS.douyin
                },
                {
                    name: 'kuaishou',
                    checker: new GenericLoginChecker('快手', { selectors: PLATFORM_CONFIGS.kuaishou.loginSelectors }),
                    config: PLATFORM_CONFIGS.kuaishou
                },
                {
                    name: 'weibo',
                    checker: new GenericLoginChecker('微博', { selectors: PLATFORM_CONFIGS.weibo.loginSelectors }),
                },
                {
                    name: 'youtube',
                    checker: new GenericLoginChecker('YouTube', { selectors: PLATFORM_CONFIGS.youtube.loginSelectors }),
                    config: PLATFORM_CONFIGS.youtube
                },
                {
                    name: 'xianyu',
                    checker: new GenericLoginChecker('咸鱼', { selectors: PLATFORM_CONFIGS.xianyu.loginSelectors }),
                    config: PLATFORM_CONFIGS.xianyu
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
                // 首先检查是否有可用的浏览器实例
                const isAvailable = await isBrowserAvailable();
                if (isAvailable) {
                    logger.info('检测到现有浏览器实例，将复用');
                    browser = await getOrCreateBrowser();
                } else {
                    logger.info('未检测到现有浏览器实例，将创建新的');
                    browser = await getOrCreateBrowser();
                }

                // 更新浏览器活动状态
                updateBrowserActivity();

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

                    logger.info(`正在访问 ${config.name} 的URL: ${config.config.uploadUrl}`);

                    try {
                        await page.goto(config.config.uploadUrl, {
                            waitUntil: config.config.waitUntil || 'domcontentloaded',
                            timeout: config.config.timeout || 30000
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

                    // 使用对应的登录检查器
                    const loginResult = await config.checker.checkLoginStatus(page);

                    logger.info(`${config.name} 登录状态检查结果:`, loginResult);

                    // 根据检测结果设置详细消息
                    const statusMessage = config.checker.getLoginStatusDescription(loginResult);

                    loginStatus[config.name] = {
                        isLoggedIn: loginResult.isLoggedIn,
                        status: 'success',
                        message: statusMessage,
                        timestamp: Date.now(),
                        details: loginResult.details
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