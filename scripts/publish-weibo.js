#!/usr/bin/env node

import { PublishService } from '../src/services/PublishService.js';
import { BrowserService } from '../src/services/BrowserService.js';
import chalk from 'chalk';

// 单个平台发布示例配置（运行即发）
const config = {
  platform: 'weibo',
  title: '微博 - 自动发布示例',
  content: '这是一条通过脚本自动发布到微博的示例内容。',
  images: [
    'https://picsum.photos/800/600?random=2001'
  ],
  tags: ['微博', '自动化']
};

async function main() {
  try {
    console.log(chalk.cyan('开始微博发布...'));
    // 按微博风格：文本与 tag 拼接，且 tag 外围使用 # 包围
    const hashtagStr = (config.tags || []).map(t => `#${t}#`).join(' ').trim();
    const formattedContent = hashtagStr ? `${config.content} ${hashtagStr}` : config.content;

    const r = await PublishService.publishSingle({
      ...config,
      content: formattedContent
    });
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} weibo: ${r.message}`);
  } catch (err) {
    console.error(chalk.red('微博发布失败:'), err?.message || err);
    process.exitCode = 1;
  } finally {
    // 不关闭浏览器，便于继续操作或上传
  }
}

main();


