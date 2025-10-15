/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-10-15 21:39:12
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-10-16 07:08:20
 * @FilePath: /yishe-scripts/Users/jackie/workspace/yishe-uploader/scripts/publish-xiaohongshu.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import {
    PublishService
} from '../src/services/PublishService.js';
import {
    BrowserService
} from '../src/services/BrowserService.js';
import chalk from 'chalk';

const config = {
    platform: 'xiaohongshu',
    title: '小红书 - 自动发布示例',
    content: '这是一条通过脚本自动发布到小红书的示例内容。#自动化 #小红书',
    images: [
        'https://picsum.photos/800/600?random=2003'
    ],
    tags: ['小红书', '自动化']
};

async function main() {
    try {
        console.log(chalk.cyan('开始小红书发布...'));
        const r = await PublishService.publishSingle(config);
        const icon = r.success ? '✅' : '❌';
        console.log(`${icon} xiaohongshu: ${r.message}`);
    } catch (err) {
        console.error(chalk.red('小红书发布失败:'), err ? err.message : err);
        process.exitCode = 1;
    } finally {
        // 保持浏览器窗口打开，便于继续操作或上传
        console.log(chalk.green('✅ 小红书发布完成，浏览器窗口保持打开状态'));
        console.log(chalk.yellow('💡 提示：可以继续运行其他平台的发布脚本'));
    }
}

main();