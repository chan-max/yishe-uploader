#!/usr/bin/env node

import { PublishService } from '../src/services/PublishService.js';
import { BrowserService } from '../src/services/BrowserService.js';
import chalk from 'chalk';

// 单个平台发布示例配置（运行即发）
const config = {
  platform: 'weibo',
  title: '微博 - 自动发布示例',
  content: '这是一条通过脚本自动发布到微博的示例内容。#自动化 #微博',
  images: [
    'https://picsum.photos/800/600?random=2001'
  ],
  tags: ['微博', '自动化']
};

async function main() {
  try {
    console.log(chalk.cyan('开始微博发布...'));
    const r = await PublishService.publishSingle(config);
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} weibo: ${r.message}`);
  } catch (err) {
    console.error(chalk.red('微博发布失败:'), err?.message || err);
    process.exitCode = 1;
  } finally {
    await BrowserService.cleanup();
  }
}

main();


