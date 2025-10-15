/**
 * 抖音发布功能
 */

import { getOrCreateBrowser } from '../services/BrowserService.js';
import { downloadImageToTemp, deleteTempFile } from '../utils/fileUtils.js';
import { SOCIAL_MEDIA_UPLOAD_URLS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';

/**
 * 发布到抖音
 */
export async function publishToDouyin(publishInfo) {
  try {
    logger.info('开始执行抖音发布操作，参数:', publishInfo);
    const browser = await getOrCreateBrowser();
    const page = await browser.newPage();
    logger.info('新页面创建成功');
    
    await page.goto(SOCIAL_MEDIA_UPLOAD_URLS.douyin_pic);
    logger.info('已打开抖音发布页面');

    // 检查登录状态
    logger.info('检查抖音登录状态...');
    const loginResult = await checkDouyinLoginStatus(page);
    
    if (!loginResult.isLoggedIn) {
      logger.info('抖音未登录，无法发布');
      return { 
        success: false, 
        message: `抖音未登录: ${loginResult.details?.reason || '未知原因'}`, 
        data: { loginStatus: loginResult } 
      };
    }
    
    logger.info('抖音已登录，继续发布流程');

    // 等待文件选择器出现
    await page.waitForSelector('input[type="file"]');
    logger.info('找到文件选择器');

    // 设置文件上传路径
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('未找到文件选择器');
    }

    // 下载并上传所有图片
    for (const imageUrl of publishInfo.images) {
      try {
        // 下载图片到临时目录
        const tempPath = await downloadImageToTemp(imageUrl, `douyin_${Date.now()}`);
        
        // 上传图片
        await fileInput.uploadFile(tempPath);
        logger.info('已上传图片:', imageUrl);
        
        // 等待图片上传完成
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        
        // 删除临时文件
        deleteTempFile(tempPath);
      } catch (error) {
        logger.error(`处理图片 ${imageUrl} 时出错:`, error);
        throw error;
      }
    }

    // 填写标题
    const titleSelector = 'input[placeholder*="标题"]';
    await page.waitForSelector(titleSelector);
    const titleText = String(publishInfo.title || '');
    if (titleText.trim()) {
      await page.type(titleSelector, titleText);
      logger.info('已填写标题:', titleText);
    } else {
      logger.info('标题为空，跳过填写');
    }

    // 填写正文内容
    const contentSelector = '.editor-kit-container';
    await page.waitForSelector(contentSelector);
    const contentText = String(publishInfo.content || '');
    if (contentText.trim()) {
      await page.type(contentSelector, contentText);
      logger.info('已填写正文内容:', contentText);
    } else {
      logger.info('正文内容为空，跳过填写');
    }

    // 等待内容填写完成
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

    // 等待页面稳定，确保所有元素都已加载
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

    // 点击发布按钮 - 使用指定的 CSS 选择器
    try {
      const buttonSelector = 'button.button-dhlUZE.primary-cECiOJ.fixed-J9O8Yw';
      await page.waitForSelector(buttonSelector, { timeout: 5000 });
      const publishButton = await page.$(buttonSelector);
      
      if (!publishButton) {
        throw new Error('未找到发布按钮：' + buttonSelector);
      }

      await page.evaluate((selector) => {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
        }
      }, buttonSelector);
      logger.info('已点击发布按钮');
    } catch (error) {
      logger.error('点击发布按钮失败:', error);
      throw new Error(`发布按钮点击失败: ${error.message}`);
    }

    // 等待发布完成
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
    
    return { success: true, message: '抖音发布成功' };
  } catch (error) {
    logger.error('抖音发布过程出错:', error);
    return { success: false, message: error?.message || '未知错误', data: error };
  }
}

/**
 * 专门检测抖音登录状态的方法
 */
export async function checkDouyinLoginStatus(page) {
  try {
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 获取当前URL，检查是否被重定向到登录页面
    const currentUrl = page.url();
    logger.info('抖音当前URL:', currentUrl);
    
    // 检查是否在登录页面
    const isOnLoginPage = currentUrl.includes('login') || 
                         currentUrl.includes('auth') || 
                         currentUrl.includes('signin') ||
                         currentUrl.includes('passport');
    
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
      // 检查用户相关元素
      const userElements = [
        '#header-avatar',
        '.user-avatar',
        '.user-info',
        '.header-user',
        '[data-testid="user-avatar"]',
        '.creator-header'
      ];
      
      // 检查登录相关元素
      const loginElements = [
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
      ];
      
      // 查找用户元素
      const foundUserElements = [];
      let hasUserElement = false;
      userElements.forEach(selector => {
        try {
          const element = document.querySelector(selector);
          if (element) {
            foundUserElements.push(selector);
            hasUserElement = true;
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
        hasHeaderAvatar: foundUserElements.includes('#header-avatar'),
        hasUserRelatedText: false
      };
      
      return {
        isLoggedIn,
        details
      };
    });
    
    logger.info('抖音登录状态检测结果:', loginStatus);
    return loginStatus;
    
  } catch (error) {
    logger.error('抖音登录状态检测失败:', error);
    return { 
      isLoggedIn: false, 
      details: { 
        error: error instanceof Error ? error.message : '检测失败',
        reason: 'detection_error'
      } 
    };
  }
}
