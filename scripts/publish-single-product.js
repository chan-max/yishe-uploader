/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/publish-single-product.js
 * @Description: 单条产品多平台发布脚本
 */

// 禁用 TLS 验证以支持自签名证书
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

import {
    queryProductById,
    queryProductByCode
} from './query-single-product.js';
import { PublishService } from '../src/services/PublishService.js';
import axios from 'axios';

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const baseUrl = env === 'dev' ? 'http://localhost:1520' : 'https://1s.design:1520';

// 智能解析参数：支持两种格式
// 格式1: node script.js prod <productId> [productCode] [platforms]
// 格式2: node script.js prod "" bg-66 [platforms] (推荐)
let productId = process.argv[3];
let productCode = process.argv[4];
let platforms = process.argv[5] ? process.argv[5].split(',') : ['xiaohongshu', 'weibo', 'douyin', 'kuaishou']; // 默认所有平台
// 取消自动参数交换：如果需要按 code 查询，请传 "" 占位并把代码放到第4个参数

/**
 * 发布到指定平台
 */
async function publishToPlatform(platform, item) {
    try {
        const result = await PublishService.publishSingle({
            platform,
            title: item.title,
            content: item.content,
            images: item.images,
            tags: item.tags || []
        });
        return {
            success: result.success,
            message: result.message,
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
 * 单条产品多平台发布
 */
async function publishSingleProductToPlatforms(item, targetPlatforms) {
    const results = [];

    console.log(`开始发布产品: ${item.title}`);
    console.log(`目标平台: ${targetPlatforms.join(', ')}`);
    console.log('---');

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

async function updateProductStatus(productId, status) {
    if (!productId) return;
    try {
        await axios.post(`${baseUrl}/api/product/update`, {
            id: productId,
            publishStatus: status
        }, {
            timeout: 15000
        });
        console.log(`✅ 已更新商品发布状态为: ${status}`);
    } catch (e) {
        console.warn(`⚠️ 更新商品发布状态失败: ${e.message}`);
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        // 检查参数
        if (!productId && !productCode) {
            console.error('请提供产品ID或产品代码');
            console.log('用法: node publish-single-product.js [dev|prod] <productId> [productCode] [platforms]');
            console.log('示例: node publish-single-product.js prod 123');
            console.log('示例: node publish-single-product.js prod "" "PROD001"');
            console.log('示例: node publish-single-product.js prod 123 "" "xiaohongshu,weibo"');
            process.exit(1);
        }

        // 获取产品数据
        let item;
        if (productId) {
            console.log(`正在查询产品ID: ${productId}`);
            item = await queryProductById(productId);
        } else {
            console.log(`正在查询产品代码: ${productCode}`);
            item = await queryProductByCode(productCode);
        }

        if (!item) {
            console.error('产品不存在或查询失败');
            process.exit(1);
        }

        console.log(`产品信息: ${item.title}`);
        console.log(`产品描述: ${item.content}`);
        console.log(`图片数量: ${item.images.length}`);
        console.log('---');

        // 执行多平台发布
        const results = await publishSingleProductToPlatforms(item, platforms);

        // 统计结果
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        console.log(`\n发布完成: ${successCount}/${totalCount} 个平台成功`);

        // 显示详细结果
        results.forEach(result => {
            const icon = result.success ? '✅' : '❌';
            console.log(`${icon} ${result.platform}: ${result.message}`);
        });

        // 如果有失败的平台，退出码为1
        if (successCount < totalCount) {
            // 部分成功，仍标记为已发布到社交媒体
            await updateProductStatus(item.id, 'published_social_media');
            process.exit(1);
        }

        // 全部成功，标记为已发布到社交媒体（如需改为 archived，可调整此处）
        await updateProductStatus(item.id, 'published_social_media');

    } catch (error) {
        console.error('单条发布失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export {
    publishSingleProductToPlatforms,
    publishToPlatform
};