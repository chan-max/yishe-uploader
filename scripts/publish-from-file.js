#!/usr/bin/env node

/**
 * 从 JS/JSON 文件读取发布配置并执行发布
 * 用法：npm run publish:file -- --file ./examples/publish-template.js [--test]
 */

import {
    PublishService
} from '../src/services/PublishService.js';
import {
    BrowserService
} from '../src/services/BrowserService.js';
import chalk from 'chalk';

async function main() {
    const fileArgIndex = process.argv.indexOf('--file');
    const isTest = process.argv.includes('--test');
    if (fileArgIndex === -1 || !process.argv[fileArgIndex + 1]) {
        console.error(chalk.red('请使用 --file 指定配置文件 (JS/JSON)'));
        process.exit(1);
    }

    const filePath = process.argv[fileArgIndex + 1];

    try {
        const {
            resolve
        } = await import('path');
        const {
            pathToFileURL
        } = await import('url');
        const resolved = resolve(process.cwd(), filePath);
        const mod = await import(pathToFileURL(resolved).href);
        const data = mod.default ? ? mod.config ? ? mod.publish ? ? mod;

        let platforms = [];
        if (Array.isArray(data)) {
            platforms = data;
        } else if (data && Array.isArray(data.platforms)) {
            platforms = data.platforms;
        } else {
            console.error(chalk.red('文件格式不正确：应导出数组或包含 platforms 数组的对象'));
            process.exit(1);
        }

        console.log('\n读取到的发布配置:');
        platforms.forEach((p) => {
            console.log(` - ${p.platform}: ${p.title || ''}`);
        });

        if (isTest) {
            console.log(chalk.yellow('\n测试模式：不会实际发布，只打印配置。'));
            return;
        }

        console.log('\n发布结果:');
        for (const p of platforms) {
            const r = await PublishService.publishSingle(p);
            const icon = r.success ? '✅' : '❌';
            console.log(`${icon} ${r.platform}: ${r.message}`);
        }
    } catch (err) {
        console.error(chalk.red('执行失败:'), err ? .message || err);
        process.exitCode = 1;
    } finally {
        // 保持浏览器窗口打开，便于继续操作或上传
        console.log(chalk.green('✅ 批量发布完成，浏览器窗口保持打开状态'));
        console.log(chalk.yellow('💡 提示：可以继续运行其他平台的发布脚本'));
        // 不清理浏览器，保持窗口打开
    }
}

main();