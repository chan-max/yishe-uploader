#!/usr/bin/env node

import {
    PublishService
} from '../src/services/PublishService.js';
import {
    BrowserService
} from '../src/services/BrowserService.js';
import chalk from 'chalk';

const config = {
    platform: 'kuaishou',
    title: '快手 - 自动发布示例',
    content: '这是一条通过脚本自动发布到快手的示例内容。#自动化 #快手',
    images: [
        'https://picsum.photos/800/600?random=2004'
    ],
    tags: ['快手', '自动化']
};

async function main() {
    try {
        console.log(chalk.cyan('开始快手发布...'));
        const r = await PublishService.publishSingle(config);
        const icon = r.success ? '✅' : '❌';
        console.log(`${icon} kuaishou: ${r.message}`);
    } catch (err) {
        console.error(chalk.red('快手发布失败:'), err ? .message || err);
        process.exitCode = 1;
    } finally {
        // 保持浏览器窗口打开，便于继续操作或上传
        console.log(chalk.green('✅ 快手发布完成，浏览器窗口保持打开状态'));
        console.log(chalk.yellow('💡 提示：可以继续运行其他平台的发布脚本'));
    }
}

main();