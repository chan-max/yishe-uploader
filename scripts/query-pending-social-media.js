/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/query-pending-social-media.js
 * @Description: 查询所有待发布社交媒体的二维产品图数据
 */

// 禁用 TLS 验证以支持自签名证书
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

import axios from 'axios';

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const baseUrl = env === 'dev' ? 'http://localhost:1520' : 'https://1s.design:1520';

// 创建不超时的 axios 实例
const axiosNoTimeout = axios.create({
    timeout: 0
});

/**
 * 转换为自媒体平台通用结构
 */
function convertToUniversalStructure(originalData) {
    return originalData.map(item => ({
        id: item.id,
        title: item.name,
        content: item.description || '',
        tags: item.keywords ? item.keywords.split(',').map(tag => tag.trim()) : [],
        images: item.images || []
    }));
}

/**
 * 查询待发布社交媒体的数据
 */
async function queryPendingSocialMediaData() {
    try {
        const response = await axiosNoTimeout.post(`${baseUrl}/api/product-image-2d/find-pending-social-media`, {
            limit: 1000
        });

        const result = response.data.data;

        if (result.data && result.data.length > 0) {
            const universalData = convertToUniversalStructure(result.data);

            console.log(JSON.stringify({
                total: result.total,
                data: universalData
            }, null, 2));

            return universalData;
        } else {
            console.log(JSON.stringify({
                total: 0,
                data: []
            }, null, 2));
            return [];
        }

    } catch (error) {
        console.error('查询失败:', error.message);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        await queryPendingSocialMediaData();
    } catch (error) {
        console.error('查询失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export {
    queryPendingSocialMediaData
};