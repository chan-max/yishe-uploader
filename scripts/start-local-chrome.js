#!/usr/bin/env node

/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/start-local-chrome.js
 * @Description: 启动本地Chrome浏览器的独立脚本
 */

import puppeteer from 'puppeteer-core';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import ora from 'ora';

const execAsync = promisify(exec);

// Chrome浏览器路径
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 用户数据目录路径（使用Chrome默认目录）
const USER_DATA_DIR = join(homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');

// 备用用户数据目录（用于避免冲突）
const BACKUP_USER_DATA_DIR = join(homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data - Uploader');

// Puppeteer启动配置
const PUPPETEER_CONFIG = {
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    userDataDir: USER_DATA_DIR,
    args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
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
        '--disable-infobars'
    ]
};

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
 * 检查Chrome进程是否在运行
 */
async function checkChromeProcess() {
    try {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq chrome.exe"');
        return stdout.includes('chrome.exe');
    } catch (error) {
        return false;
    }
}


/**
 * 创建Puppeteer配置
 */
function createPuppeteerConfig(userDataDir) {
    return {
        executablePath: CHROME_PATH,
        headless: false,
        defaultViewport: null,
        userDataDir: userDataDir,
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
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
            '--disable-infobars'
        ]
    };
}

/**
 * 启动本地Chrome浏览器并打开百度
 */
async function startLocalChrome() {
    const spinner = ora('正在启动本地Chrome浏览器...').start();
    
    try {
        // 检查Chrome是否存在
        if (!checkChromeExists()) {
            spinner.fail('Chrome浏览器检查失败');
            process.exit(1);
        }

        spinner.text = '正在检查Chrome进程...';
        
        // 检查Chrome是否在运行
        const isChromeRunning = await checkChromeProcess();
        let userDataDir = USER_DATA_DIR;
        
        if (isChromeRunning) {
            spinner.text = '检测到Chrome正在运行，使用备用用户数据目录...';
            userDataDir = BACKUP_USER_DATA_DIR;
            console.log(chalk.yellow('\n⚠️  检测到Chrome浏览器正在运行'));
            console.log(chalk.blue('💡 将使用备用用户数据目录以避免冲突'));
            console.log(chalk.gray(`   备用目录: ${userDataDir}`));
        }

        spinner.text = '正在启动Chrome浏览器...';
        
        // 创建配置并启动Chrome
        const config = createPuppeteerConfig(userDataDir);
        const browser = await puppeteer.launch(config);
        
        // 浏览器启动成功
        spinner.succeed('Chrome浏览器启动成功！');
        
        // 尝试打开百度（非阻塞）
        spinner.text = '正在打开百度...';
        spinner.start();
        
        try {
            // 创建新页面并打开百度
            const page = await browser.newPage();
            
            // 设置页面超时
            page.setDefaultTimeout(10000);
            
            // 尝试打开百度，使用最宽松的等待条件
            await Promise.race([
                page.goto('https://www.baidu.com', { 
                    waitUntil: 'load',
                    timeout: 10000 
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('页面加载超时')), 10000)
                )
            ]);
            
            spinner.succeed('百度页面加载成功！');
        } catch (pageError) {
            // 如果页面加载失败，但浏览器已启动，继续执行
            spinner.succeed('浏览器已启动（页面加载跳过）');
            console.log(chalk.yellow('⚠️  页面加载跳过，但浏览器已正常启动'));
            console.log(chalk.gray(`   提示: 你可以手动在浏览器中打开 https://www.baidu.com`));
        }
        
        console.log(chalk.green('\n🎉 本地Chrome浏览器已启动！'));
        console.log(chalk.blue('📋 启动信息:'));
        console.log(`   - Chrome路径: ${CHROME_PATH}`);
        console.log(`   - 用户数据目录: ${userDataDir}`);
        console.log(`   - 调试端口: 9222`);
        console.log(`   - 已打开: https://www.baidu.com`);
        
        console.log(chalk.yellow('\n💡 使用说明:'));
        console.log('   - 浏览器将保持打开状态');
        if (userDataDir === USER_DATA_DIR) {
            console.log('   - 使用本地用户数据，保留登录状态');
        } else {
            console.log('   - 使用备用用户数据目录（独立环境）');
        }
        console.log('   - 可以手动操作浏览器');
        console.log('   - 按 Ctrl+C 可以退出此脚本（浏览器会保持打开）');
        
        console.log(chalk.cyan('\n🔗 可用的平台链接:'));
        console.log('   - 微博: https://weibo.com');
        console.log('   - 抖音: https://creator.douyin.com/creator-micro/content/upload?default-tab=3');
        console.log('   - 小红书: https://creator.xiaohongshu.com/publish/publish?target=image');
        console.log('   - 快手: https://cp.kuaishou.com/article/publish/video?tabType=2');
        
        // 保持脚本运行
        console.log(chalk.green('\n✅ Chrome浏览器已独立运行'));
        console.log(chalk.yellow('💡 提示：按 Ctrl+C 可以退出此脚本'));
        
        // 处理退出信号
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('\n🛑 收到退出信号，正在退出脚本...'));
            try {
                await browser.close();
                console.log(chalk.green('✅ Chrome浏览器已关闭'));
            } catch (error) {
                console.log(chalk.green('✅ Chrome浏览器将继续运行'));
            }
            process.exit(0);
        });
        
        // 保持进程运行
        const keepAliveInterval = setInterval(async () => {
            try {
                // 检查浏览器是否还在运行
                if (!browser.isConnected()) {
                    console.log(chalk.red('❌ Chrome进程已结束'));
                    clearInterval(keepAliveInterval);
                    process.exit(1);
                }
            } catch (error) {
                console.log(chalk.red('❌ Chrome进程已结束'));
                clearInterval(keepAliveInterval);
                process.exit(1);
            }
        }, 5000);

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
    console.log(chalk.cyan('🚀 本地Chrome浏览器启动脚本 (使用Puppeteer)'));
    console.log(chalk.blue('\n📋 功能说明:'));
    console.log('   - 使用puppeteer-core控制本地Chrome浏览器');
    console.log('   - 自动打开百度首页');
    console.log('   - 支持手动操作和自动化控制');
    console.log('   - 保持浏览器独立运行');
    
    console.log(chalk.blue('\n🔧 配置信息:'));
    console.log(`   - Chrome路径: ${CHROME_PATH}`);
    console.log(`   - 主用户数据目录: ${USER_DATA_DIR}`);
    console.log(`   - 备用用户数据目录: ${BACKUP_USER_DATA_DIR}`);
    console.log(`   - 调试端口: 9222`);
    console.log('   - 默认打开: https://www.baidu.com');
    
    console.log(chalk.blue('\n📖 使用方法:'));
    console.log('   node scripts/start-local-chrome.js');
    console.log('   npm run chrome:local');
    
    console.log(chalk.blue('\n💡 注意事项:'));
    console.log('   - 确保Chrome已正确安装');
    console.log('   - 确保已安装puppeteer-core依赖');
    console.log('   - 如果Chrome正在运行，会使用备用用户数据目录');
    console.log('   - 固定使用9222调试端口');
    console.log('   - 主目录保留完整用户数据，备用目录为独立环境');
    console.log('   - 浏览器会保持打开状态');
    console.log('   - 可以手动操作浏览器');
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    await startLocalChrome();
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main().catch(error => {
        console.error(chalk.red('❌ 脚本执行失败:'), error.message);
        process.exit(1);
    });
}

export { startLocalChrome, checkChromeExists };
