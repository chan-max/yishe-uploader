#!/usr/bin/env node

/**
 * 小红书Cookie同步脚本
 * 将txt文件中的认证数据同步到浏览器
 */

// 禁用 TLS 验证以支持自签名证书
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

import {
    getOrCreateBrowser
} from '../src/services/BrowserService.js';
import {
    xiaohongshuAuth
} from '../src/utils/xiaohongshuAuth.js';
import {
    authDataParser
} from '../src/utils/authDataParser.js';
import {
    logger
} from '../src/utils/logger.js';
import chalk from 'chalk';

/**
 * 同步小红书Cookie
 */
async function syncXiaohongshuCookies() {
    let page = null;
    try {
        console.log(chalk.cyan('🔄 开始同步小红书Cookie...'));

        // 检查认证数据文件
        const authData = authDataParser.parseAuthData();
        if (!authData) {
            console.log(chalk.red('❌ 认证数据文件不存在或格式错误'));
            console.log(chalk.yellow('💡 请将成功的请求信息复制到 auth-data/xiaohongshu-auth.txt 文件中'));
            return false;
        }

        console.log(chalk.blue('📄 认证数据解析成功:'));
        console.log(`- URL: ${authData.url}`);
        console.log(`- 方法: ${authData.method}`);
        console.log(`- 状态: ${authData.status}`);
        console.log(`- Cookie数量: ${authData.cookies.length}`);
        console.log(`- 请求头数量: ${Object.keys(authData.headers).length}`);

        // 获取浏览器实例
        const browser = await getOrCreateBrowser();
        page = await browser.newPage();

        // 应用认证
        console.log(chalk.blue('🔐 应用小红书认证...'));
        const authSuccess = await xiaohongshuAuth.applyAuth(page);

        if (!authSuccess) {
            console.log(chalk.red('❌ 认证应用失败'));
            return false;
        }

        // 验证登录状态
        console.log(chalk.blue('🔍 验证登录状态...'));
        await page.goto('https://creator.xiaohongshu.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 检查登录状态
        const isLoggedIn = await page.evaluate(() => {
            return document.querySelector('.user_avatar, [class="user_avatar"], .reds-avatar-border') !== null;
        });

        if (isLoggedIn) {
            console.log(chalk.green('✅ 登录状态验证成功'));
        } else {
            console.log(chalk.yellow('⚠️ 可能未登录，请检查认证数据'));
        }

        // 检查Cookie
        const cookies = await page.cookies();
        const xiaohongshuCookies = cookies.filter(cookie =>
            cookie.domain.includes('xiaohongshu.com')
        );

        console.log(chalk.blue(`🍪 小红书Cookie数量: ${xiaohongshuCookies.length}`));

        if (xiaohongshuCookies.length > 0) {
            console.log(chalk.green('✅ Cookie同步成功'));

            // 显示关键Cookie
            const importantCookies = [
                'access-token-creator.xiaohongshu.com',
                'customer-sso-sid',
                'x-user-id-creator.xiaohongshu.com',
                'customerClientId'
            ];

            console.log(chalk.blue('🔑 关键Cookie状态:'));
            importantCookies.forEach(name => {
                const cookie = xiaohongshuCookies.find(c => c.name.includes(name));
                if (cookie) {
                    console.log(chalk.green(`✅ ${name}: ${cookie.value.substring(0, 30)}...`));
                } else {
                    console.log(chalk.red(`❌ ${name}: 缺失`));
                }
            });
        } else {
            console.log(chalk.red('❌ 未发现小红书Cookie'));
        }

        // 测试API请求
        console.log(chalk.blue('🧪 测试API请求...'));
        try {
            const response = await page.goto('https://edith.xiaohongshu.com/web_api/sns/v5/creator/topic/template/list', {
                waitUntil: 'networkidle2',
                timeout: 10000
            });

            if (response && response.status() === 200) {
                console.log(chalk.green('✅ API请求成功 (200)'));
            } else if (response && response.status() === 401) {
                console.log(chalk.red('❌ API请求失败 (401) - 认证失败'));
            } else {
                console.log(chalk.yellow(`⚠️ API请求状态: ${response ? response.status() : '无响应'}`));
            }
        } catch (error) {
            console.log(chalk.red(`❌ API请求出错: ${error.message}`));
        }

        console.log(chalk.cyan('🎉 Cookie同步完成！'));
        return true;

    } catch (error) {
        console.error(chalk.red('❌ 同步Cookie失败:'), error.message);
        return false;
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (closeError) {
                console.warn(chalk.yellow('⚠️ 关闭页面时出错:'), closeError.message);
            }
        }
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        const success = await syncXiaohongshuCookies();

        if (success) {
            console.log(chalk.green('\n🎯 同步成功！现在可以运行发布脚本了'));
            console.log(chalk.blue('💡 运行命令:'));
            console.log('npm run publish:xiaohongshu');
        } else {
            console.log(chalk.red('\n❌ 同步失败，请检查认证数据'));
            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red('❌ 执行过程出错:'), error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export {
    syncXiaohongshuCookies
};