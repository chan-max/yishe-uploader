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
import {
    publishWeiboItem
} from './publish-weibo.js';
import {
    publishXiaohongshuItem
} from './publish-xiaohongshu.js';
import {
    publishDouyinItem
} from './publish-douyin.js';
import {
    publishKuaishouItem
} from './publish-kuaishou.js';

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const productId = process.argv[3];
const productCode = process.argv[4];
const platforms = process.argv[5] ? process.argv[5].split(',') : ['xiaohongshu', 'weibo', 'douyin', 'kuaishou']; // 默认所有平台

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
            process.exit(1);
        }

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