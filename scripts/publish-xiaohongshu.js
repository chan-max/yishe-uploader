/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-10-15 21:39:12
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/publish-xiaohongshu.js
 * @Description: 小红书平台发布脚本 - 兼容通用数据结构
 */

// 禁用 TLS 验证以支持自签名证书
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

import {
    PublishService
} from '../src/services/PublishService.js';
import {
    queryPendingSocialMediaData
} from './query-pending-social-media.js';

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const dataIndex = parseInt(process.argv[3]) || 0; // 默认使用第一条数据

/**
 * 格式化小红书内容
 */
function formatXiaohongshuContent(content, tags) {
    const hashtagStr = (tags || []).map(t => `#${t}`).join(' ').trim();
    return hashtagStr ? `${content} ${hashtagStr}` : content;
}

/**
 * 发布单条小红书
 */
async function publishXiaohongshuItem(item) {
    try {
        const config = {
            platform: 'xiaohongshu',
            title: item.title,
            content: formatXiaohongshuContent(item.content, item.tags),
            images: item.images,
            tags: item.tags
        };

        const result = await PublishService.publishSingle(config);
        return {
            success: result.success,
            message: result.message,
            itemId: item.id
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            itemId: item.id
        };
    }
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
        console.log(`发布小红书: ${item.title}`);

        const result = await publishXiaohongshuItem(item);
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} 小红书发布结果: ${result.message}`);

    } catch (error) {
        console.error('小红书发布失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export {
    publishXiaohongshuItem
};