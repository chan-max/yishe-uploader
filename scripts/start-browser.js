/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-10-16 06:54:26
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-10-27 00:02:12
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

// 禁用 TLS 验证以支持自签名证书
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

import {
    BrowserService
} from '../src/services/BrowserService.js';
import {
    xiaohongshuAuth
} from '../src/utils/xiaohongshuAuth.js';
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

        // 应用小红书认证
        console.log(chalk.cyan('🔐 正在应用小红书认证...'));
        try {
            const authSuccess = await xiaohongshuAuth.applyAuth(page);
            if (authSuccess) {
                console.log(chalk.green('✅ 小红书认证应用成功'));

                // 验证登录状态
                await page.goto('https://creator.xiaohongshu.com/', {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                await new Promise(resolve => setTimeout(resolve, 3000));

                // 检查登录状态
                const isLoggedIn = await page.evaluate(() => {
                    // 多种方式检查登录状态
                    const avatarSelectors = [
                        '.user_avatar', '[class="user_avatar"]', '.reds-avatar-border',
                        '.avatar', '.user-info', '.user-profile',
                        '[data-testid="user-avatar"]', '.user-menu'
                    ];

                    for (const selector of avatarSelectors) {
                        if (document.querySelector(selector)) {
                            return true;
                        }
                    }

                    // 检查是否有登录相关的文本
                    const loginTexts = ['登录', '注册', 'Sign in', 'Login'];
                    const hasLoginText = loginTexts.some(text =>
                        document.body.innerText.includes(text)
                    );

                    return !hasLoginText; // 如果没有登录文本，可能已经登录
                });

                if (isLoggedIn) {
                    console.log(chalk.green('✅ 小红书登录状态验证成功'));
                } else {
                    console.log(chalk.yellow('⚠️ 小红书可能未登录，请检查认证数据'));

                    // 输出页面信息用于调试
                    const pageInfo = await page.evaluate(() => {
                        return {
                            url: window.location.href,
                            title: document.title,
                            hasLoginText: document.body.innerText.includes('登录'),
                            hasRegisterText: document.body.innerText.includes('注册'),
                            bodyText: document.body.innerText.substring(0, 200)
                        };
                    });

                    console.log(chalk.blue('🔍 页面调试信息:'));
                    console.log(`- URL: ${pageInfo.url}`);
                    console.log(`- 标题: ${pageInfo.title}`);
                    console.log(`- 包含登录文本: ${pageInfo.hasLoginText}`);
                    console.log(`- 包含注册文本: ${pageInfo.hasRegisterText}`);
                    console.log(`- 页面内容预览: ${pageInfo.bodyText}...`);
                }
            } else {
                console.log(chalk.red('❌ 小红书认证应用失败'));
            }
        } catch (error) {
            console.log(chalk.red('❌ 应用小红书认证时出错:'), error.message);
        }

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