#!/usr/bin/env node

/**
 * 独立脚本：检查各平台登录状态
 * 用法：npm run check-login  或  node scripts/check-login.js [--force]
 */

import { PublishService } from '../src/services/PublishService.js';
import { BrowserService } from '../src/services/BrowserService.js';
import chalk from 'chalk';

async function main() {
  const force = process.argv.includes('--force');

  console.log('\n================ 登录状态检查 ================');
  console.log(`时间: ${new Date().toLocaleString()}`);
  console.log(`强制刷新: ${force ? '是' : '否'}`);
  console.log('============================================\n');

  try {
    const loginStatus = await PublishService.checkSocialMediaLoginStatus(force);

    const entries = Object.entries(loginStatus);
    if (entries.length === 0) {
      console.log(chalk.yellow('未返回任何平台的登录状态。'));
      return;
    }

    for (const [platform, status] of entries) {
      const icon = status.isLoggedIn ? '✅' : status.status === 'error' ? '⚠️' : '❌';
      const color = status.isLoggedIn
        ? chalk.green
        : status.status === 'error'
        ? chalk.yellow
        : chalk.red;
      console.log(`${icon} ${color(platform)}: ${status.message || ''}`);
    }

    const ok = entries.filter(([, s]) => s.isLoggedIn).length;
    const total = entries.length;
    console.log('\n合计: ', chalk.green(`${ok}`), '/', total);
  } catch (err) {
    console.error(chalk.red('检查登录状态失败:'), err?.message || err);
    process.exitCode = 1;
  } finally {
    await BrowserService.cleanup();
  }
}

main();


