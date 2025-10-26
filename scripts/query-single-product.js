/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-10-26 23:36:14
 * @FilePath: /yishe-uploader/scripts/query-single-product.js
 * @Description: 根据产品ID或产品代码查询单个产品数据
 */

// 禁用 TLS 验证以支持自签名证书
// 如果服务器使用有效的 SSL 证书，可以注释掉这行
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

import axios from 'axios';
import {
    createAxiosInstance,
    testHttpsConnection
} from '../src/utils/network.js';

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const baseUrl = env === 'dev' ? 'http://localhost:1520' : 'https://1s.design:1520';

// 检查是否应该禁用 TLS 验证
const shouldDisableTls = process.env.NODE_ENV === 'development' ||
    process.env.DISABLE_TLS_VERIFY === 'true' ||
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

// 创建不超时的 axios 实例
const axiosNoTimeout = createAxiosInstance({
    timeout: 0,
    useSecureHttps: !shouldDisableTls
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
 * 测试网络连接
 */
async function testNetworkConnection() {
    try {
        console.log('🔍 正在测试网络连接...');

        // 测试目标服务器连接
        const serverTest = await testHttpsConnection(baseUrl);
        if (!serverTest.success) {
            console.error('❌ 目标服务器连接失败:', serverTest.message);
            throw new Error(`无法连接到服务器: ${baseUrl}`);
        } else {
            console.log('✅ 目标服务器连接正常');
            if (serverTest.warning) {
                console.warn('⚠️ ', serverTest.warning);
            }
        }

        return true;
    } catch (error) {
        console.error('❌ 网络连接测试失败:', error.message);
        throw error;
    }
}
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
            console.error('❌ 请提供产品ID或产品代码');
            console.log('用法: node query-single-product.js [dev|prod] <productId> [productCode]');
            console.log('示例: node query-single-product.js prod "" "bg-66"');
            process.exit(1);
        }

        // 测试网络连接
        await testNetworkConnection();

        let result;
        if (productId) {
            console.log(`🔍 正在查询产品ID: ${productId}`);
            result = await queryProductById(productId);
        } else {
            console.log(`🔍 正在查询产品代码: ${productCode}`);
            result = await queryProductByCode(productCode);
        }

        if (!result) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ 查询失败:', error.message);
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