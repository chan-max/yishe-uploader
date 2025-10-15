#!/usr/bin/env node

/**
 * Yishe Uploader - 多媒体自动发布脚本
 * 支持微博、抖音、小红书、快手等平台的自动化发布
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { PublishService } from './services/PublishService.js';
import { BrowserService } from './services/BrowserService.js';
import { logger } from './utils/logger.js';

// 设置程序信息
program
  .name('yishe-uploader')
  .description('多媒体自动发布脚本 - 支持微博、抖音、小红书、快手等平台')
  .version('1.0.0');

// 发布命令
program
  .command('publish')
  .description('发布内容到社交媒体平台')
  .option('--file <file>', '从 JS/JSON 文件加载发布配置对象')
  .option('-p, --platform <platform>', '指定平台 (weibo|douyin|xiaohongshu|kuaishou)')
  .option('-P, --platforms <platforms>', '指定多个平台，用逗号分隔')
  .option('-t, --title <title>', '发布标题')
  .option('-c, --content <content>', '发布内容')
  .option('-i, --images <images>', '图片URL，用逗号分隔')
  .option('--tags <tags>', '标签，用逗号分隔')
  .option('--headless', '无头模式运行浏览器')
  .option('--test', '测试模式，不实际发布')
  .action(async (options) => {
    const spinner = ora('正在初始化发布服务...').start();
    
    try {
      let publishConfigs = [];
      if (options.file) {
        // 从文件加载对象
        const { resolve } = await import('path');
        const { pathToFileURL } = await import('url');
        const resolved = resolve(process.cwd(), options.file);
        const mod = await import(pathToFileURL(resolved).href);
        const data = mod.default ?? mod.config ?? mod.publish ?? mod;
        if (Array.isArray(data)) {
          publishConfigs = data;
        } else if (data && Array.isArray(data.platforms)) {
          publishConfigs = data.platforms;
        } else {
          spinner.fail('文件格式不正确：应导出数组或包含 platforms 数组的对象');
          process.exit(1);
        }
      } else {
        // 验证参数（命令行模式）
        if (!options.platform && !options.platforms) {
          spinner.fail('请指定要发布的平台，或使用 --file 指定配置文件');
          process.exit(1);
        }

        if (!options.title && !options.content) {
          spinner.fail('请提供标题或内容，或使用 --file 指定配置文件');
          process.exit(1);
        }

        // 解析平台列表
        const platforms = options.platforms 
          ? options.platforms.split(',').map(p => p.trim())
          : [options.platform];

        // 解析图片列表
        const images = options.images 
          ? options.images.split(',').map(img => img.trim())
          : [];

        // 解析标签列表
        const tags = options.tags 
          ? options.tags.split(',').map(tag => tag.trim())
          : [];

        // 构建发布配置
        publishConfigs = platforms.map(platform => ({
          platform,
          title: options.title || '',
          content: options.content || '',
          images,
          tags
        }));
      }

      spinner.text = '正在检查登录状态...';
      
      // 检查登录状态
      const loginStatus = await PublishService.checkSocialMediaLoginStatus();
      
      // 显示登录状态
      console.log('\n📱 登录状态检查结果:');
      Object.entries(loginStatus).forEach(([platform, status]) => {
        const icon = status.isLoggedIn ? '✅' : '❌';
        const color = status.isLoggedIn ? chalk.green : chalk.red;
        console.log(`  ${icon} ${color(platform)}: ${status.message}`);
      });

      if (options.test) {
        spinner.succeed('测试模式 - 跳过实际发布');
        console.log('\n📋 发布配置预览:');
        publishConfigs.forEach(config => {
          console.log(`\n🎯 平台: ${config.platform}`);
          console.log(`📝 标题: ${config.title}`);
          console.log(`📄 内容: ${config.content}`);
          console.log(`🖼️  图片: ${config.images.length} 张`);
          console.log(`🏷️  标签: ${config.tags.join(', ')}`);
        });
        return;
      }

      spinner.text = '正在发布内容...';
      
      // 执行发布（逐个平台）。不关闭浏览器，便于继续操作
      const results = [];
      for (const cfg of publishConfigs) {
        const r = await PublishService.publishSingle(cfg);
        results.push(r);
      }
      
      spinner.succeed('发布完成');
      
      // 显示发布结果
      console.log('\n📊 发布结果:');
      results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const color = result.success ? chalk.green : chalk.red;
        console.log(`  ${icon} ${color(result.platform)}: ${result.message}`);
      });

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      console.log(`\n📈 成功率: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);

    } catch (error) {
      spinner.fail('发布失败');
      logger.error('发布过程出错:', error);
      process.exit(1);
    } finally {
      // 不清理浏览器，便于继续操作或继续上传
    }
  });

// 检查登录状态命令
program
  .command('check-login')
  .description('检查各平台登录状态')
  .option('--force', '强制刷新登录状态')
  .action(async (options) => {
    const spinner = ora('正在检查登录状态...').start();
    
    try {
      const loginStatus = await PublishService.checkSocialMediaLoginStatus(options.force);
      
      spinner.succeed('登录状态检查完成');
      
      console.log('\n📱 登录状态:');
      Object.entries(loginStatus).forEach(([platform, status]) => {
        const icon = status.isLoggedIn ? '✅' : '❌';
        const color = status.isLoggedIn ? chalk.green : chalk.red;
        console.log(`  ${icon} ${color(platform)}: ${status.message}`);
      });

    } catch (error) {
      spinner.fail('检查登录状态失败');
      logger.error('检查登录状态出错:', error);
      process.exit(1);
    } finally {
      // 不清理浏览器，便于继续操作或继续上传
    }
  });

// 测试命令
program
  .command('test')
  .description('测试发布功能')
  .option('-p, --platform <platform>', '测试指定平台')
  .action(async (options) => {
    const spinner = ora('正在执行测试...').start();
    
    try {
      const testContent = {
        platform: options.platform || 'douyin',
        title: '测试发布',
        content: '这是一条测试发布内容，用于验证发布功能。',
        images: ['https://picsum.photos/800/600?random=1'],
        tags: ['测试', '发布']
      };

      spinner.text = '正在测试发布...';
      const results = [await PublishService.publishSingle(testContent)];
      
      spinner.succeed('测试完成');
      
      results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const color = result.success ? chalk.green : chalk.red;
        console.log(`  ${icon} ${color(result.platform)}: ${result.message}`);
      });

    } catch (error) {
      spinner.fail('测试失败');
      logger.error('测试过程出错:', error);
      process.exit(1);
    } finally {
      await BrowserService.cleanup();
    }
  });

// 浏览器管理命令
program
  .command('browser')
  .description('浏览器管理')
  .option('--status', '查看浏览器状态')
  .option('--close', '关闭浏览器')
  .option('--clear-data', '清除用户数据')
  .action(async (options) => {
    if (options.status) {
      const status = await BrowserService.getStatus();
      console.log('🔍 浏览器状态:', status);
    } else if (options.close) {
      const spinner = ora('正在关闭浏览器...').start();
      await BrowserService.close();
      spinner.succeed('浏览器已关闭');
    } else if (options.clearData) {
      const spinner = ora('正在清除用户数据...').start();
      await BrowserService.clearUserData();
      spinner.succeed('用户数据已清除');
    } else {
      console.log('请指定操作: --status, --close, 或 --clear-data');
    }
  });

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
