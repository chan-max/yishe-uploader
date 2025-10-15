/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-10-15 21:39:12
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-10-16 06:59:57
 * @FilePath: /yishe-scripts/Users/jackie/workspace/yishe-uploader/scripts/publish-weibo.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import {
    PublishService
} from '../src/services/PublishService.js';
import {
    BrowserService
} from '../src/services/BrowserService.js';
import chalk from 'chalk';

// 单个平台发布示例配置（运行即发）
const config = {
    platform: 'weibo',
    title: 'hello',
    content: '早上好',
    images: [
        'https://picsum.photos/800/600?random=2001'
    ],
    tags: ['开心', '快乐']
};

async function main() {
    try {
        console.log(chalk.cyan('开始微博发布...'));
        // 按微博风格：文本与 tag 拼接，且 tag 外围使用 # 包围
        const hashtagStr = (config.tags || []).map(t => `#${t}#`).join(' ').trim();
        const formattedContent = hashtagStr ? `${config.content} ${hashtagStr}` : config.content;

        const r = await PublishService.publishSingle({
            ...config,
            content: formattedContent
        });
        const icon = r.success ? '✅' : '❌';
        console.log(`${icon} weibo: ${r.message}`);
    } catch (err) {
        console.error(chalk.red('微博发布失败:'), err ? err.message : err);
        process.exitCode = 1;
    } finally {
        // 保持浏览器窗口打开，便于继续操作或上传
        console.log(chalk.green('✅ 微博发布完成，浏览器窗口保持打开状态'));
        console.log(chalk.yellow('💡 提示：可以继续运行其他平台的发布脚本'));
    }
}

main();