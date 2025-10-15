/**
 * 基本使用示例
 */

import { PublishService } from '../src/services/PublishService.js';
import { BrowserService } from '../src/services/BrowserService.js';
import { logger } from '../src/utils/logger.js';

async function basicExample() {
  logger.info('🚀 开始基本使用示例...');
  
  try {
    // 1. 检查登录状态
    logger.info('📱 检查登录状态...');
    const loginStatus = await PublishService.checkSocialMediaLoginStatus();
    
    Object.entries(loginStatus).forEach(([platform, status]) => {
      const icon = status.isLoggedIn ? '✅' : '❌';
      logger.info(`  ${icon} ${platform}: ${status.message}`);
    });
    
    // 2. 准备发布内容
    const publishContent = {
      platform: 'douyin',
      title: '示例发布',
      content: '这是一个使用 yishe-uploader 的示例发布内容。\n\n#自动化 #发布 #示例',
      images: [
        'https://picsum.photos/800/600?random=1',
        'https://picsum.photos/800/600?random=2'
      ],
      tags: ['自动化', '发布', '示例']
    };
    
    // 3. 执行发布
    logger.info('📤 开始发布内容...');
    const results = await PublishService.publishToMultiplePlatforms([publishContent], 'example-001');
    
    // 4. 显示结果
    logger.info('📊 发布结果:');
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      logger.info(`  ${icon} ${result.platform}: ${result.message}`);
    });
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    logger.info(`📈 成功率: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);
    
  } catch (error) {
    logger.error('❌ 示例执行失败:', error);
  } finally {
    // 清理资源
    await BrowserService.cleanup();
    logger.info('🧹 资源清理完成');
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  basicExample();
}

export { basicExample };
