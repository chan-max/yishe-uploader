/**
 * 页面操作器 - 提供通用的页面操作工具
 */

import { logger } from '../utils/logger.js';

/**
 * 页面操作器类
 */
export class PageOperator {
    /**
     * 延迟执行
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 设置反检测脚本
     */
    async setupAntiDetection(page) {
        // Playwright: userAgent 需要在 context 创建时设置；这里保持“脚本注入/headers/viewport”能力
        // 注入反检测脚本
        await page.addInitScript(() => {
            // 更彻底的 webdriver 伪装
            delete navigator.__proto__.webdriver;

            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
                configurable: true,
                enumerable: false
            });

            if ('webdriver' in navigator) {
                delete navigator.webdriver;
            }

            // 使用 Proxy 来拦截所有访问
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

            try {
                Object.defineProperty(window, 'navigator', {
                    value: navigatorProxy,
                    writable: false,
                    configurable: false
                });
            } catch (e) {
                console.log('无法替换全局 navigator，使用备用方案');
            }

            // 伪装其他属性
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            Object.defineProperty(navigator, 'languages', {
                get: () => ['zh-CN', 'zh', 'en'],
            });

            Object.defineProperty(navigator, 'platform', {
                get: () => 'MacIntel',
            });

            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8,
            });

            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });

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
        });

        // 设置视口大小
        await page.setViewportSize({ width: 1920, height: 1080 });

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
     * 填写输入框
     */
    async fillInput(page, selector, text, options = {}) {
        await page.waitForSelector(selector, { timeout: 10000 });
        
        const defaultOptions = {
            delay: 100,
            clear: true
        };
        
        const fillOptions = { ...defaultOptions, ...options };
        
        if (fillOptions.clear) {
            await page.click(selector, { clickCount: 3 }); // 全选
            await page.keyboard.press('Backspace'); // 删除
        }
        
        await page.type(selector, text, { delay: fillOptions.delay });
    }

    /**
     * 检查按钮是否可用
     */
    async isButtonEnabled(page, selector) {
        return await page.evaluate((sel) => {
            const button = document.querySelector(sel);
            if (!button) return false;
            
            const isDisabled = button.disabled;
            const hasDisabledClass = button.classList.contains('disabled') || 
                                    button.classList.contains('loading') ||
                                    button.classList.contains('uploading');
            const isVisible = window.getComputedStyle(button).display !== 'none' && 
                             window.getComputedStyle(button).visibility !== 'hidden';
            
            return !isDisabled && !hasDisabledClass && isVisible;
        }, selector);
    }

    /**
     * 等待按钮变为可用状态
     */
    async waitForButtonEnabled(page, selector, timeout = 30000) {
        const maxWaitTime = timeout;
        const checkInterval = 1000;
        let elapsedTime = 0;
        
        logger.info('等待按钮变为可用状态...');
        
        while (elapsedTime < maxWaitTime) {
            try {
                const buttonStatus = await page.evaluate((sel) => {
                    const button = document.querySelector(sel);
                    if (!button) {
                        return { exists: false, enabled: false, reason: '按钮不存在' };
                    }
                    
                    const isDisabled = button.disabled;
                    const hasDisabledClass = button.classList.contains('disabled') || 
                                            button.classList.contains('loading') ||
                                            button.classList.contains('uploading');
                    const isVisible = window.getComputedStyle(button).display !== 'none' && 
                                     window.getComputedStyle(button).visibility !== 'hidden';
                    
                    return {
                        exists: true,
                        enabled: !isDisabled && !hasDisabledClass && isVisible,
                        reason: isDisabled ? '按钮被禁用' : 
                               hasDisabledClass ? '按钮有禁用类' : 
                               !isVisible ? '按钮不可见' : '按钮可用'
                    };
                }, selector);
                
                if (buttonStatus.exists && buttonStatus.enabled) {
                    logger.info('按钮已可用');
                    return true;
                } else {
                    logger.info(`按钮状态: ${buttonStatus.reason}`);
                }
                
            } catch (error) {
                logger.warn('检查按钮状态时出错:', error);
            }
            
            await this.delay(checkInterval);
            elapsedTime += checkInterval;
        }
        
        logger.warn('等待按钮可用超时');
        return false;
    }

    /**
     * 等待元素出现
     */
    async waitForElement(page, selector, timeout = 10000) {
        try {
            await page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            logger.warn(`等待元素 ${selector} 超时`);
            return false;
        }
    }

    /**
     * 安全点击元素
     */
    async safeClick(page, selector, options = {}) {
        try {
            await page.waitForSelector(selector, { timeout: 10000 });
            
            // 先悬停
            await page.hover(selector);
            await this.delay(500);
            
            // 点击
            await page.click(selector, options);
            return true;
        } catch (error) {
            logger.error(`点击元素 ${selector} 失败:`, error);
            return false;
        }
    }

    /**
     * 执行页面内脚本
     */
    async executeScript(page, script, ...args) {
        try {
            return await page.evaluate(script, ...args);
        } catch (error) {
            logger.error('执行页面脚本失败:', error);
            throw error;
        }
    }

    /**
     * 检查元素是否存在
     */
    async elementExists(page, selector) {
        try {
            const element = await page.$(selector);
            return !!element;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取元素文本
     */
    async getElementText(page, selector) {
        try {
            return await page.$eval(selector, el => el.textContent);
        } catch (error) {
            logger.warn(`获取元素 ${selector} 文本失败:`, error);
            return '';
        }
    }

    /**
     * 滚动到元素
     */
    async scrollToElement(page, selector) {
        try {
            await page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, selector);
            await this.delay(1000);
        } catch (error) {
            logger.warn(`滚动到元素 ${selector} 失败:`, error);
        }
    }

    /**
     * 等待网络空闲
     */
    async waitForNetworkIdle(page, timeout = 30000) {
        try {
            await page.waitForLoadState('networkidle', { timeout });
        } catch (error) {
            logger.warn('等待网络空闲超时');
        }
    }

    /**
     * 截图
     */
    async takeScreenshot(page, filename) {
        try {
            const screenshot = await page.screenshot({ 
                path: filename,
                fullPage: true 
            });
            logger.info(`截图已保存: ${filename}`);
            return screenshot;
        } catch (error) {
            logger.error('截图失败:', error);
            throw error;
        }
    }
}
