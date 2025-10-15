/**
 * 快手发布功能
 */

import { getOrCreateBrowser } from '../services/BrowserService.js';
import { downloadImageToTemp, deleteTempFile } from '../utils/fileUtils.js';
import { SOCIAL_MEDIA_UPLOAD_URLS } from '../config/platforms.js';
import { logger } from '../utils/logger.js';

/**
 * 发布到快手
 */
export async function publishToKuaishou(publishInfo) {
  try {
    logger.info('开始执行快手发布操作，参数:', publishInfo);
    const browser = await getOrCreateBrowser();
    const page = await browser.newPage();
    logger.info('新页面创建成功');

    await page.goto(SOCIAL_MEDIA_UPLOAD_URLS.kuaishou_pic);
    logger.info('已打开快手发布页面');

    // 等待页面完全加载
    await page.waitForSelector('#rc-tabs-0-panel-2', { timeout: 10000 });
    logger.info('页面基本元素已加载');

    // 等待文件选择器出现
    await page.waitForSelector('input[type="file"]');
    logger.info('找到文件选择器');

    // 上传所有图片（如有多张）
    if (publishInfo.images && Array.isArray(publishInfo.images) && publishInfo.images.length > 0) {
      // 下载所有图片到本地
      const tempPaths = [];
      for (const imageUrl of publishInfo.images) {
        try {
          const tempPath = await downloadImageToTemp(imageUrl, `kuaishou_${Date.now()}`);
          tempPaths.push(tempPath);
        } catch (error) {
          logger.error(`处理图片 ${imageUrl} 时出错:`, error);
          throw error;
        }
      }
      
      // 一次性上传所有图片
      const uploadButtons = await page.$$('button[class^="_upload-btn_"]');
      const uploadButton = uploadButtons[1];
      if (!uploadButton) {
        throw new Error('未找到上传按钮');
      }
      
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        uploadButton.click()
      ]);
      
      await fileChooser.accept(tempPaths);
      logger.info('已上传所有图片:', tempPaths);
      
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
      
      // 删除临时文件
      for (const tempPath of tempPaths) {
        deleteTempFile(tempPath);
      }
    }

    // 填写正文内容（富文本）
    const contentSelector = '#work-description-edit';
    await page.waitForSelector(contentSelector);
    await page.evaluate((selector, content) => {
      const el = document.querySelector(selector);
      if (el) {
        el.innerHTML = content;
      }
    }, contentSelector, publishInfo.content || '');
    logger.info('已填写正文内容');

    // 等待内容填写完成
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

    // 点击发布按钮
    const submitButton = await page.waitForSelector('div[class^="_section-form-btns_"] > div:first-child');
    if (!submitButton) {
      throw new Error('未找到发布按钮');
    }
    await submitButton.click();
    logger.info('已点击发布按钮');

    // 等待发布完成
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
    
    // 发布成功，返回结果
    return { success: true, message: '快手发布成功' };
  } catch (error) {
    logger.error('快手发布过程出错:', error);
    return { success: false, message: error?.message || '未知错误', data: error };
  }
}
