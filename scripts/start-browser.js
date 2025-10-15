/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-10-16 06:54:26
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-10-16 07:04:03
 * @FilePath: /yishe-scripts/Users/jackie/workspace/yishe-uploader/scripts/start-browser.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 浏览器启动脚本
 * 用法：npm run browser:start 或 node scripts/start-browser.js [--keep-open]
 * 
 * 这个脚本会启动一个浏览器实例，其他发布脚本可以直接使用这个窗口
 * 默认情况下进程会保持运行，按 Ctrl+C 可以退出
 */

import {
    BrowserService
} from '../src/services/BrowserService.js';
import chalk from 'chalk';

async function main() {
    const keepOpen = process.argv.includes('--keep-open');

    try {
        console.log(chalk.cyan('🚀 启动浏览器实例...'));

        // 检查是否已经有浏览器在运行
        const isAvailable = await BrowserService.isBrowserAvailable();
        if (isAvailable) {
            console.log(chalk.green('✅ 浏览器已经在运行中'));
            const status = BrowserService.getStatus();
            console.log(`   - 页面数量: ${status.pageCount}`);
            console.log(`   - 最后活动: ${status.lastActivity ? new Date(status.lastActivity).toLocaleString() : '无'}`);
            console.log(chalk.yellow('💡 可以直接运行其他发布脚本'));
            return;
        }

        // 启动新的浏览器实例
        const browser = await BrowserService.getOrCreateBrowser();
        console.log(chalk.green('✅ 浏览器启动成功！'));

        // 打开一个默认页面
        const page = await browser.newPage();
        await page.goto('about:blank');
        console.log(chalk.blue('📄 已打开默认页面'));

        const status = BrowserService.getStatus();
        console.log('\n浏览器状态:');
        console.log(`- 已初始化: ${status.isInitialized ? '✅' : '❌'}`);
        console.log(`- 已连接: ${status.isConnected ? '✅' : '❌'}`);
        console.log(`- 页面数量: ${status.pageCount}`);
        console.log(`- 启动时间: ${status.timestamp}`);

        console.log(chalk.green('\n🎉 浏览器已准备就绪！'));
        console.log(chalk.yellow('💡 现在可以运行其他发布脚本：'));
        console.log('   npm run publish:weibo');
        console.log('   npm run publish:douyin');
        console.log('   npm run publish:xiaohongshu');
        console.log('   npm run publish:kuaishou');
        console.log('   npm run check-login');

        if (keepOpen) {
            console.log(chalk.cyan('\n⏳ 浏览器将保持打开状态，按 Ctrl+C 退出...'));

            // 保持进程运行，直到用户手动退出
            process.on('SIGINT', async () => {
                console.log(chalk.yellow('\n🛑 收到退出信号，正在关闭浏览器...'));
                await BrowserService.close();
                console.log(chalk.green('✅ 浏览器已关闭'));
                process.exit(0);
            });

            // 保持进程运行
            await new Promise(() => {});
        } else {
            console.log(chalk.cyan('\n⏳ 浏览器将保持打开状态，进程将保持运行...'));
            console.log(chalk.yellow('💡 提示：按 Ctrl+C 可以退出进程（浏览器窗口会保持打开）'));

            // 保持进程运行，直到用户手动退出
            process.on('SIGINT', async () => {
                console.log(chalk.yellow('\n🛑 收到退出信号，正在关闭浏览器...'));
                await BrowserService.close();
                console.log(chalk.green('✅ 浏览器已关闭'));
                process.exit(0);
            });

            // 保持进程运行
            await new Promise(() => {});
        }

    } catch (error) {
        console.error(chalk.red('❌ 启动浏览器失败:'), error ? error.message : error);
        process.exitCode = 1;
    }
}

main();