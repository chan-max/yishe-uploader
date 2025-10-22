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
 * 检查用户数据目录是否被占用
 */
async function checkUserDataDirLocked(userDataDir) {
    try {
        // 尝试检查Chrome是否真的在使用这个用户数据目录
        const { stdout } = await execAsync('wmic process where "name=\'chrome.exe\'" get commandline /format:list');
        return stdout.includes(userDataDir.replace(/\\/g, '\\\\'));
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
            '--disable-features=ResourceTiming',
            '--disable-features=PerformanceObserver',
            '--disable-features=WorkerRouterEvaluation',
            '--disable-features=BrowserResourceTiming',
            '--disable-features=WebWorkerTiming',
            '--remote-debugging-port=9222',
            '--disable-automation',
            '--disable-infobars'
        ]
    };
}

/**
 * 启动本地Chrome浏览器并打开百度
 */
async function startLocalChrome(useIndependentMode = false) {
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
        let useBackupDir = false;
        
        if (useIndependentMode) {
            // 独立模式：直接使用备用目录
            console.log(chalk.blue('\n🔧 独立模式：使用独立用户数据目录'));
            console.log(chalk.gray(`   目录: ${BACKUP_USER_DATA_DIR}`));
            userDataDir = BACKUP_USER_DATA_DIR;
            useBackupDir = true;
        } else if (isChromeRunning) {
            console.log(chalk.yellow('\n⚠️  检测到Chrome浏览器正在运行'));
            
            // 检查是否真的在使用主用户数据目录
            const isMainDirLocked = await checkUserDataDirLocked(USER_DATA_DIR);
            
            if (isMainDirLocked) {
                console.log(chalk.blue('💡 主用户数据目录被占用，使用备用目录'));
                console.log(chalk.gray(`   备用目录: ${BACKUP_USER_DATA_DIR}`));
                userDataDir = BACKUP_USER_DATA_DIR;
                useBackupDir = true;
            } else {
                console.log(chalk.green('✅ 主用户数据目录可用，将保留登录状态'));
            }
        } else {
            console.log(chalk.green('✅ 将使用本地用户数据，保留登录状态'));
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
            
            // 注入自动化检测脚本
            await page.evaluate(() => {
                // 定义全局检测函数
                window.detectAutomation = function() {
                    // 检测自动化特征
                    const automationChecks = {
                        // 检查 webdriver 属性
                        webdriver: !!navigator.webdriver,
                        
                        // 检查自动化相关的属性
                        automation: !!window.chrome && !!window.chrome.runtime && !!window.chrome.runtime.onConnect,
                        
                        // 检查 puppeteer 特征
                        puppeteer: !!window.__puppeteer || !!window.__nightmare || !!window.__webdriver_evaluate,
                        
                        // 检查 selenium 特征
                        selenium: !!window.domAutomation || !!window.domAutomationController,
                        
                        // 检查插件
                        plugins: navigator.plugins.length === 0,
                        
                        // 检查语言
                        languages: navigator.languages.length === 0,
                        
                        // 检查权限
                        permissions: !navigator.permissions || !navigator.permissions.query,
                        
                        // 检查自动化标识
                        automationId: !!document.querySelector('[data-automation-id]'),
                        
                        // 检查用户代理
                        userAgent: navigator.userAgent.includes('HeadlessChrome') || 
                                  navigator.userAgent.includes('Chrome-Lighthouse'),
                        
                        // 检查窗口大小
                        windowSize: window.screen.width === 0 || window.screen.height === 0,
                        
                        // 检查自动化控制标识
                        automationControlled: !!window.navigator.webdriver || 
                                            !!window.chrome && window.chrome.runtime && 
                                            window.chrome.runtime.id === 'nmmhkkegccagdldgiimedpiccmgmieda',
                        
                        // 检查额外的自动化特征
                        chromeRuntime: !!window.chrome && !!window.chrome.runtime && !!window.chrome.runtime.id,
                        
                        // 检查自动化扩展
                        automationExtension: !!window.chrome && window.chrome.runtime && 
                                           window.chrome.runtime.id === 'nmmhkkegccagdldgiimedpiccmgmieda',
                        
                        // 检查自动化标识符
                        automationMarker: !!document.querySelector('meta[name="automation"]') ||
                                        !!document.querySelector('[data-automation="true"]'),
                        
                        // 检查自动化事件监听器
                        automationListeners: !!window.addEventListener.toString().includes('native code') === false
                    };
                    
                    // 计算自动化概率
                    const totalChecks = Object.keys(automationChecks).length;
                    const positiveChecks = Object.values(automationChecks).filter(Boolean).length;
                    const automationProbability = (positiveChecks / totalChecks * 100).toFixed(1);
                    
                    // 输出检测结果
                    console.log('%c🤖 自动化检测报告', 'color: #ff6b6b; font-size: 16px; font-weight: bold;');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    Object.entries(automationChecks).forEach(([key, value]) => {
                        const status = value ? '❌ 检测到' : '✅ 正常';
                        const color = value ? '#ff6b6b' : '#51cf66';
                        console.log(`%c${key}: ${status}`, `color: ${color}; font-weight: bold;`);
                    });
                    
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log(`%c自动化概率: ${automationProbability}%`, 'color: #339af0; font-size: 14px; font-weight: bold;');
                    
                    if (automationProbability > 30) {
                        console.log('%c⚠️  警告: 当前窗口可能被识别为自动化操作', 'color: #ff6b6b; font-size: 14px; font-weight: bold;');
                        console.log('%c💡 建议: 使用 --no-user-data 参数启动独立模式', 'color: #ffd43b; font-size: 12px;');
                    } else {
                        console.log('%c✅ 当前窗口看起来像正常用户操作', 'color: #51cf66; font-size: 14px; font-weight: bold;');
                    }
                    
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    // 返回检测结果
                    return {
                        automationChecks,
                        automationProbability: parseFloat(automationProbability),
                        isAutomation: automationProbability > 30
                    };
                };
                
                // 自动运行一次检测
                return window.detectAutomation();
            });
            
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
        if (useBackupDir) {
            console.log('   - 使用备用用户数据目录（独立环境）');
            console.log('   - 需要重新登录各平台账号');
        } else {
            console.log('   - 使用本地用户数据，保留登录状态');
            console.log('   - 可以直接使用已登录的账号');
        }
        console.log('   - 可以手动操作浏览器');
        console.log('   - 按 Ctrl+C 可以退出此脚本（浏览器会保持打开）');
        
        console.log(chalk.cyan('\n🔗 可用的平台链接:'));
        console.log('   - 微博: https://weibo.com');
        console.log('   - 抖音: https://creator.douyin.com/creator-micro/content/upload?default-tab=3');
        console.log('   - 小红书: https://creator.xiaohongshu.com/publish/publish?target=image');
        console.log('   - 快手: https://cp.kuaishou.com/article/publish/video?tabType=2');
        
        console.log(chalk.magenta('\n🔍 自动化检测:'));
        console.log('   - 在浏览器控制台中查看自动化检测报告');
        console.log('   - 手动检测: 在控制台输入 detectAutomation()');
        console.log('   - 检测结果会显示在控制台中');
        
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
    console.log('   node scripts/start-local-chrome.js --no-user-data');
    console.log('   node scripts/start-local-chrome.js --independent');
    console.log('   npm run chrome:local');
    console.log('   npm run chrome:local -- --no-user-data');
    
    console.log(chalk.blue('\n💡 注意事项:'));
    console.log('   - 确保Chrome已正确安装');
    console.log('   - 确保已安装puppeteer-core依赖');
    console.log('   - 默认使用本地用户数据，保留登录状态');
    console.log('   - 使用 --no-user-data 或 --independent 参数启用独立模式');
    console.log('   - 独立模式下使用备用用户数据目录，需要重新登录');
    console.log('   - 浏览器会保持打开状态');
    console.log('   - 可以手动操作浏览器');
    
    console.log(chalk.blue('\n🔧 参数说明:'));
    console.log('   --no-user-data    使用独立用户数据目录（不保留登录状态）');
    console.log('   --independent     同上，使用独立用户数据目录');
    console.log('   --help, -h        显示帮助信息');
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    // 检查是否使用独立环境（不使用本地用户数据）
    const useIndependentMode = args.includes('--no-user-data') || args.includes('--independent');
    
    await startLocalChrome(useIndependentMode);
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main().catch(error => {
        console.error(chalk.red('❌ 脚本执行失败:'), error.message);
        process.exit(1);
    });
}

export { startLocalChrome, checkChromeExists };
