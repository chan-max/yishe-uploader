/**
 * 测试文件
 */

import { PublishService } from '../src/services/PublishService.js';
import { BrowserService } from '../src/services/BrowserService.js';
import { logger } from '../src/utils/logger.js';

async function testLoginStatus() {
  logger.info('开始测试登录状态检查...');
  
  try {
    const loginStatus = await PublishService.checkSocialMediaLoginStatus();
    
    logger.info('登录状态检查结果:');
    Object.entries(loginStatus).forEach(([platform, status]) => {
      const icon = status.isLoggedIn ? '✅' : '❌';
      logger.info(`  ${icon} ${platform}: ${status.message}`);
    });
    
  } catch (error) {
    logger.error('测试登录状态失败:', error);
  } finally {
    await BrowserService.cleanup();
  }
}

async function testBrowserService() {
  logger.info('开始测试浏览器服务...');
  
  try {
    // 测试浏览器状态
    const status = await BrowserService.getStatus();
    logger.info('浏览器状态:', status);
    
    // 测试创建浏览器
    const browser = await BrowserService.getOrCreateBrowser();
    logger.info('浏览器创建成功');
    
    // 测试创建页面
    const page = await browser.newPage();
    logger.info('页面创建成功');
    
    // 测试访问页面
    await page.goto('https://www.baidu.com');
    logger.info('页面访问成功');
    
    await page.close();
    logger.info('页面关闭成功');
    
  } catch (error) {
    logger.error('测试浏览器服务失败:', error);
  } finally {
    await BrowserService.cleanup();
  }
}

async function testPublishService() {
  logger.info('开始测试发布服务...');
  
  try {
    const testContent = {
      platform: 'douyin',
      title: '测试发布',
      content: '这是一条测试发布内容。',
      images: ['https://picsum.photos/800/600?random=1'],
      tags: ['测试']
    };
    
    const results = await PublishService.publishToMultiplePlatforms([testContent], 'test');
    
    logger.info('发布测试结果:');
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      logger.info(`  ${icon} ${result.platform}: ${result.message}`);
    });
    
  } catch (error) {
    logger.error('测试发布服务失败:', error);
  } finally {
    await BrowserService.cleanup();
  }
}

// 主测试函数
async function runTests() {
  logger.info('🚀 开始运行测试...');
  
  try {
    await testBrowserService();
    await testLoginStatus();
    // await testPublishService(); // 取消注释以测试发布功能
    
    logger.success('✅ 所有测试完成');
  } catch (error) {
    logger.error('❌ 测试失败:', error);
  }
}

// 如果直接运行此文件，则执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testLoginStatus, testBrowserService, testPublishService };
