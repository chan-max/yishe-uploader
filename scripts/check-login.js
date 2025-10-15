/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-10-15 21:39:12
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-10-16 07:08:35
 * @FilePath: /yishe-scripts/Users/jackie/workspace/yishe-uploader/scripts/check-login.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 独立脚本：检查各平台登录状态
 * 用法：npm run check-login  或  node scripts/check-login.js [--force]
 */

import {
    PublishService
} from '../src/services/PublishService.js';
import {
    BrowserService
} from '../src/services/BrowserService.js';
import {
    SOCIAL_MEDIA_UPLOAD_URLS
} from '../src/config/platforms.js';
import chalk from 'chalk';

async function main() {
    const force = process.argv.includes('--force');

    console.log('\n================ 登录状态检查 ================');
    console.log(`时间: ${new Date().toLocaleString()}`);
    console.log(`强制刷新: ${force ? '是' : '否'}`);
    console.log('============================================\n');

    let shouldCleanup = true;
    try {
        const loginStatus = await PublishService.checkSocialMediaLoginStatus(force);

        const entries = Object.entries(loginStatus);
        if (entries.length === 0) {
            console.log(chalk.yellow('未返回任何平台的登录状态。'));
            return;
        }

        for (const [platform, status] of entries) {
            const icon = status.isLoggedIn ? '✅' : status.status === 'error' ? '⚠️' : '❌';
            const color = status.isLoggedIn ?
                chalk.green :
                status.status === 'error' ?
                chalk.yellow :
                chalk.red;
            console.log(`${icon} ${color(platform)}: ${status.message || ''}`);
        }

        const notLoggedIn = entries.filter(([, s]) => !s.isLoggedIn);
        const ok = entries.length - notLoggedIn.length;
        const total = entries.length;
        console.log('\n合计: ', chalk.green(`${ok}`), '/', total);

        // 对于未登录的平台，自动打开对应发布页面并保持浏览器不关闭，便于手动登录
        if (notLoggedIn.length > 0) {
            console.log('\n未登录的平台将自动打开发布页面，请在打开的页面中完成登录：');
            const browser = await BrowserService.getOrCreateBrowser();
            for (const [platform] of notLoggedIn) {
                const targetUrl =
                    platform === 'weibo' ? SOCIAL_MEDIA_UPLOAD_URLS.weibo :
                    platform === 'douyin' ? SOCIAL_MEDIA_UPLOAD_URLS.douyin_pic :
                    platform === 'xiaohongshu' ? SOCIAL_MEDIA_UPLOAD_URLS.xiaohongshu_pic :
                    platform === 'kuaishou' ? SOCIAL_MEDIA_UPLOAD_URLS.kuaishou_pic :
                    null;
                if (!targetUrl) continue;
                const page = await browser.newPage();
                await page.goto(targetUrl, {
                    waitUntil: 'domcontentloaded'
                });
                console.log(` - 已打开 ${platform} 登录/发布页面: ${targetUrl}`);
            }
            console.log('\n提示: 完成登录后，可重新运行本命令验证登录状态。浏览器将保持开启。');
            console.log(chalk.green('✅ 浏览器窗口保持打开状态，可以继续运行其他发布脚本'));
            shouldCleanup = false; // 不清理，保持浏览器与页面开启
            // 保持进程常驻，直到用户 Ctrl+C 结束
            await new Promise(() => {});
        }
    } catch (err) {
        console.error(chalk.red('检查登录状态失败:'), err ? err.message : err);
        process.exitCode = 1;
    } finally {
        // 仅当全部已登录时才清理
        if (shouldCleanup) {
            try {
                await BrowserService.cleanup();
            } catch {}
        }
    }
}

main();