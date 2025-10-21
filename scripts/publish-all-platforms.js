/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/publish-all-platforms.js
 * @Description: 批量发布到所有自媒体平台
 */

import { queryPendingSocialMediaData } from './query-pending-social-media.js';
import { publishWeiboItem } from './publish-weibo.js';
import { publishXiaohongshuItem } from './publish-xiaohongshu.js';
import { publishDouyinItem } from './publish-douyin.js';
import { publishKuaishouItem } from './publish-kuaishou.js';

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const dataIndex = parseInt(process.argv[3]) || 0; // 默认使用第一条数据
const platforms = process.argv[4] ? process.argv[4].split(',') : ['weibo', 'xiaohongshu', 'douyin', 'kuaishou']; // 默认所有平台

/**
 * 发布到指定平台
 */
async function publishToPlatform(platform, item) {
    const platformFunctions = {
        weibo: publishWeiboItem,
        xiaohongshu: publishXiaohongshuItem,
        douyin: publishDouyinItem,
        kuaishou: publishKuaishouItem
    };

    const publishFunction = platformFunctions[platform];
    if (!publishFunction) {
        return {
            success: false,
            message: `不支持的平台: ${platform}`,
            platform,
            itemId: item.id
        };
    }

    try {
        const result = await publishFunction(item);
        return {
            ...result,
            platform
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            platform,
            itemId: item.id
        };
    }
}

/**
 * 批量发布到所有平台
 */
async function publishToAllPlatforms(item, targetPlatforms) {
    const results = [];
    
    for (const platform of targetPlatforms) {
        console.log(`正在发布到 ${platform}...`);
        const result = await publishToPlatform(platform, item);
        results.push(result);
        
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} ${platform}: ${result.message}`);
        
        // 平台间发布间隔
        if (platform !== targetPlatforms[targetPlatforms.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    return results;
}

/**
 * 主函数
 */
async function main() {
    try {
        // 获取待发布数据
        const data = await queryPendingSocialMediaData();
        
        if (!data || data.length === 0) {
            console.log('没有可发布的数据');
            return;
        }

        // 检查索引是否有效
        if (dataIndex >= data.length) {
            console.log(`数据索引 ${dataIndex} 超出范围，总共 ${data.length} 条数据`);
            return;
        }

        const item = data[dataIndex];
        console.log(`开始批量发布: ${item.title}`);
        console.log(`目标平台: ${platforms.join(', ')}`);
        
        const results = await publishToAllPlatforms(item, platforms);
        
        // 统计结果
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        console.log(`\n发布完成: ${successCount}/${totalCount} 个平台成功`);
        
        // 显示详细结果
        results.forEach(result => {
            const icon = result.success ? '✅' : '❌';
            console.log(`${icon} ${result.platform}: ${result.message}`);
        });
        
    } catch (error) {
        console.error('批量发布失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export { publishToAllPlatforms, publishToPlatform };
