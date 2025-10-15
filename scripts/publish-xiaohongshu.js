#!/usr/bin/env node

import { PublishService } from '../src/services/PublishService.js';
import { BrowserService } from '../src/services/BrowserService.js';
import chalk from 'chalk';

const config = {
  platform: 'xiaohongshu',
  title: '小红书 - 自动发布示例',
  content: '这是一条通过脚本自动发布到小红书的示例内容。#自动化 #小红书',
  images: [
    'https://picsum.photos/800/600?random=2003'
  ],
  tags: ['小红书', '自动化']
};

async function main() {
  try {
    console.log(chalk.cyan('开始小红书发布...'));
    const r = await PublishService.publishSingle(config);
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} xiaohongshu: ${r.message}`);
  } catch (err) {
    console.error(chalk.red('小红书发布失败:'), err?.message || err);
    process.exitCode = 1;
  } finally {
    await BrowserService.cleanup();
  }
}

main();


