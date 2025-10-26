#!/usr/bin/env node

/**
 * 浏览器状态管理脚本
 * 用法：npm run browser:status 或 node scripts/browser-status.js [--close]
 */

// 禁用 TLS 验证以支持自签名证书
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

import {
    BrowserService
} from '../src/services/BrowserService.js';
import chalk from 'chalk';

async function main() {
    const shouldClose = process.argv.includes('--close');

    try {
        if (shouldClose) {
            console.log(chalk.yellow('正在关闭浏览器...'));
            await BrowserService.close();
            console.log(chalk.green('✅ 浏览器已关闭'));
        } else {
            console.log(chalk.cyan('检查浏览器状态...'));
            const status = BrowserService.getStatus();

            console.log('\n浏览器状态信息:');
            console.log(`- 已初始化: ${status.isInitialized ? '✅' : '❌'}`);
            console.log(`- 已连接: ${status.isConnected ? '✅' : '❌'}`);
            console.log(`- 页面数量: ${status.pageCount}`);
            console.log(`- 最后活动: ${status.lastActivity ? new Date(status.lastActivity).toLocaleString() : '无'}`);
            console.log(`- 检查时间: ${status.timestamp}`);

            if (status.isConnected) {
                console.log(chalk.green('\n✅ 浏览器正在运行，可以执行发布脚本'));
            } else {
                console.log(chalk.yellow('\n⚠️ 浏览器未运行，执行发布脚本时会自动启动'));
            }
        }
    } catch (err) {
        console.error(chalk.red('操作失败:'), err ? .message || err);
        process.exitCode = 1;
    }
}

main();