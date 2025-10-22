#!/usr/bin/env node

/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/start-local-chrome.js
 * @Description: 启动本地Chrome浏览器的独立脚本
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';

// Chrome浏览器路径
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 不指定用户数据目录，使用Chrome默认目录

// Chrome启动参数
const CHROME_ARGS = [
    '--start-maximized',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-extensions-except',
    '--disable-plugins-discovery',
    '--disable-default-apps',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-domain-reliability',
    '--disable-component-extensions-with-background-pages',
    '--disable-background-networking',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-report-upload',
    '--remote-debugging-port=9222',
    '--disable-automation',
    '--disable-infobars',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-images',
    '--disable-javascript',
    '--disable-default-apps',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-domain-reliability',
    '--disable-component-extensions-with-background-pages',
    '--disable-background-networking',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-report-upload'
];

/**
 * 检查Chrome是否存在
 */
function checkChromeExists() {
    if (!existsSync(CHROME_PATH)) {
        console.error(chalk.red('❌ Chrome浏览器不存在于指定路径:'), CHROME_PATH);
        console.error(chalk.yellow('💡 请确认Chrome已正确安装'));
        return false;
    }
    return true;
}

/**
 * 启动本地Chrome浏览器
 */
function startLocalChrome() {
    const spinner = ora('正在启动本地Chrome浏览器...').start();
    
    try {
        // 检查Chrome是否存在
        if (!checkChromeExists()) {
            spinner.fail('Chrome浏览器检查失败');
            process.exit(1);
        }

        spinner.text = '正在启动Chrome浏览器...';
        
        // 启动Chrome进程
        const chromeProcess = spawn(CHROME_PATH, CHROME_ARGS, {
            detached: true,
            stdio: 'ignore'
        });

        // 处理进程事件
        chromeProcess.on('error', (error) => {
            spinner.fail('启动Chrome失败');
            console.error(chalk.red('❌ 启动Chrome时出错:'), error.message);
            process.exit(1);
        });

        chromeProcess.on('spawn', () => {
            spinner.succeed('Chrome浏览器启动成功！');
            
            console.log(chalk.green('\n🎉 本地Chrome浏览器已启动！'));
            console.log(chalk.blue('📋 启动信息:'));
            console.log(`   - Chrome路径: ${CHROME_PATH}`);
            console.log(`   - 用户数据目录: Chrome默认目录`);
            console.log(`   - 调试端口: 9222`);
            console.log(`   - 进程ID: ${chromeProcess.pid}`);
            
            console.log(chalk.yellow('\n💡 使用说明:'));
            console.log('   - 浏览器将保持打开状态');
            console.log('   - 可以手动登录各个平台');
            console.log('   - 登录信息会保存在用户数据目录中');
            console.log('   - 按 Ctrl+C 可以退出此脚本（浏览器会保持打开）');
            
            console.log(chalk.cyan('\n🔗 可用的平台链接:'));
            console.log('   - 微博: https://weibo.com');
            console.log('   - 抖音: https://creator.douyin.com/creator-micro/content/upload?default-tab=3');
            console.log('   - 小红书: https://creator.xiaohongshu.com/publish/publish?target=image');
            console.log('   - 快手: https://cp.kuaishou.com/article/publish/video?tabType=2');
            
            // 分离进程，让Chrome独立运行
            chromeProcess.unref();
            
            // 保持脚本运行
            console.log(chalk.green('\n✅ Chrome浏览器已独立运行'));
            console.log(chalk.yellow('💡 提示：按 Ctrl+C 可以退出此脚本'));
            
            // 处理退出信号
            process.on('SIGINT', () => {
                console.log(chalk.yellow('\n🛑 收到退出信号，正在退出脚本...'));
                console.log(chalk.green('✅ Chrome浏览器将继续运行'));
                process.exit(0);
            });
            
            // 保持进程运行
            setInterval(() => {
                // 检查Chrome进程是否还在运行
                if (chromeProcess.killed) {
                    console.log(chalk.red('❌ Chrome进程已结束'));
                    process.exit(1);
                }
            }, 5000);
            
        });

    } catch (error) {
        spinner.fail('启动Chrome失败');
        console.error(chalk.red('❌ 启动Chrome时出错:'), error.message);
        process.exit(1);
    }
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log(chalk.cyan('🚀 本地Chrome浏览器启动脚本'));
    console.log(chalk.blue('\n📋 功能说明:'));
    console.log('   - 直接启动您本地安装的Chrome浏览器');
    console.log('   - 不使用puppeteer内置浏览器');
    console.log('   - 保持浏览器独立运行');
    console.log('   - 支持手动登录和操作');
    
    console.log(chalk.blue('\n🔧 配置信息:'));
    console.log(`   - Chrome路径: ${CHROME_PATH}`);
    console.log(`   - 用户数据目录: Chrome默认目录`);
    console.log(`   - 调试端口: 9222`);
    
    console.log(chalk.blue('\n📖 使用方法:'));
    console.log('   node scripts/start-local-chrome.js');
    console.log('   npm run chrome:local');
    
    console.log(chalk.blue('\n💡 注意事项:'));
    console.log('   - 确保Chrome已正确安装');
    console.log('   - 浏览器会保持打开状态');
    console.log('   - 可以手动登录各个平台');
    console.log('   - 登录信息会保存到用户数据目录');
}

// 主函数
function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    startLocalChrome();
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export { startLocalChrome, checkChromeExists };
