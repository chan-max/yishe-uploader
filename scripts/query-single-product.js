/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/query-single-product.js
 * @Description: 根据产品ID或产品代码查询单个产品数据
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
    // 提取图片列表
    const images = [];
    for (let i = 1; i <= 10; i++) {
        const imageUrl = originalData[`image${i}`];
        if (imageUrl && imageUrl.trim()) {
            images.push(imageUrl);
        }
    }

    return {
        id: originalData.id,
        title: originalData.name,
        content: originalData.description || '',
        tags: originalData.keywords ? originalData.keywords.split(',').map(tag => tag.trim()) : [],
        images: images
    };
}

/**
 * 根据产品ID查询单个产品数据
 */
async function queryProductById(productId) {
    try {
        const response = await axiosNoTimeout.get(`${baseUrl}/api/product-image-2d/${productId}`);

        if (response.data.status && response.data.data) {
            const universalData = convertToUniversalStructure(response.data.data);

            console.log(JSON.stringify({
                success: true,
                data: universalData
            }, null, 2));

            return universalData;
        } else {
            console.log(JSON.stringify({
                success: false,
                message: '产品不存在或查询失败'
            }, null, 2));
            return null;
        }

    } catch (error) {
        console.error('查询失败:', error.message);
        throw error;
    }
}

/**
 * 根据产品代码查询单个产品数据
 */
async function queryProductByCode(productCode) {
    try {
        const response = await axiosNoTimeout.post(`${baseUrl}/api/product-image-2d/find-by-code`, {
            code: productCode
        });

        if (response.data.status && response.data.data) {
            const universalData = convertToUniversalStructure(response.data.data);

            console.log(JSON.stringify({
                success: true,
                data: universalData
            }, null, 2));

            return universalData;
        } else {
            console.log(JSON.stringify({
                success: false,
                message: '产品不存在或查询失败'
            }, null, 2));
            return null;
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
        const productId = process.argv[3];
        const productCode = process.argv[4];

        if (!productId && !productCode) {
            console.error('请提供产品ID或产品代码');
            console.log('用法: node query-single-product.js [dev|prod] <productId> [productCode]');
            process.exit(1);
        }

        let result;
        if (productId) {
            result = await queryProductById(productId);
        } else {
            result = await queryProductByCode(productCode);
        }

        if (!result) {
            process.exit(1);
        }

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
    queryProductById,
    queryProductByCode
};