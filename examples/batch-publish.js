/**
 * 批量发布示例
 */

import { PublishService } from '../src/services/PublishService.js';
import { BrowserService } from '../src/services/BrowserService.js';
import { logger } from '../src/utils/logger.js';

async function batchPublishExample() {
  logger.info('🚀 开始批量发布示例...');
  
  try {
    // 准备多个发布内容
    const publishContents = [
      {
        platform: 'weibo',
        title: '微博发布测试',
        content: '这是发布到微博的测试内容。\n\n#微博 #测试 #自动化',
        images: ['https://picsum.photos/800/600?random=3'],
        tags: ['微博', '测试', '自动化']
      },
      {
        platform: 'douyin',
        title: '抖音发布测试',
        content: '这是发布到抖音的测试内容。\n\n#抖音 #测试 #自动化',
        images: ['https://picsum.photos/800/600?random=4'],
        tags: ['抖音', '测试', '自动化']
      },
      {
        platform: 'xiaohongshu',
        title: '小红书发布测试',
        content: '这是发布到小红书的测试内容。\n\n#小红书 #测试 #自动化',
        images: ['https://picsum.photos/800/600?random=5'],
        tags: ['小红书', '测试', '自动化']
      }
    ];
    
    // 执行批量发布
    logger.info('📤 开始批量发布到多个平台...');
    const results = await PublishService.publishToMultiplePlatforms(publishContents, 'batch-example-001');
    
    // 统计结果
    const successResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    logger.info('📊 批量发布结果统计:');
    logger.info(`✅ 成功: ${successResults.length} 个平台`);
    logger.info(`❌ 失败: ${failedResults.length} 个平台`);
    
    // 显示详细结果
    logger.info('\n📋 详细结果:');
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? '成功' : '失败';
      logger.info(`  ${icon} ${result.platform}: ${status} - ${result.message}`);
      
      if (!result.success && result.data?.loginStatus) {
        logger.info(`    └─ 登录状态: ${result.data.loginStatus}`);
      }
    });
    
    // 计算成功率
    const successRate = ((successResults.length / results.length) * 100).toFixed(1);
    logger.info(`\n📈 总体成功率: ${successRate}%`);
    
    // 如果有失败的，显示失败原因
    if (failedResults.length > 0) {
      logger.info('\n❌ 失败原因分析:');
      const loginIssues = failedResults.filter(r => r.data?.loginStatus === 'not_logged_in');
      const otherIssues = failedResults.filter(r => r.data?.loginStatus !== 'not_logged_in');
      
      if (loginIssues.length > 0) {
        logger.info(`  🔐 登录问题: ${loginIssues.map(r => r.platform).join(', ')}`);
      }
      
      if (otherIssues.length > 0) {
        logger.info(`  ⚠️  其他问题: ${otherIssues.map(r => r.platform).join(', ')}`);
      }
    }
    
  } catch (error) {
    logger.error('❌ 批量发布示例执行失败:', error);
  } finally {
    // 清理资源
    await BrowserService.cleanup();
    logger.info('🧹 资源清理完成');
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  batchPublishExample();
}

export { batchPublishExample };
