/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/query-pending-social-media.js
 * @Description: 查询所有待发布社交媒体的二维产品图数据
 */

// 查询所有待发布社交媒体的二维产品图数据

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import axios from 'axios';
import chalk from 'chalk';

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const baseUrl = env === 'dev' ? 'http://localhost:1520' : 'https://1s.design:1520';

// 创建不超时的 axios 实例
const axiosNoTimeout = axios.create({
    timeout: 0
});

/**
 * 查询待发布社交媒体的数据
 */
async function queryPendingSocialMediaData() {
    try {
        console.log(chalk.cyan(`查询待发布社交媒体的二维产品图数据... [${env}]`));
        console.log(chalk.cyan(`请求地址: ${baseUrl}/api/product-image-2d/find-pending-social-media`));
        
        const response = await axiosNoTimeout.post(`${baseUrl}/api/product-image-2d/find-pending-social-media`, {
            limit: 1000
        });
        
        const result = response.data.data; // 获取嵌套的data字段
        
        
        console.log(chalk.green('\n=== 查询结果 ==='));
        console.log(chalk.green(`总数: ${result.total} 条记录`));
        
        if (result.data && result.data.length > 0) {
            // 统计有图片的记录数
            const recordsWithImages = result.data.filter(item => item.images && item.images.length > 0);
            const totalImages = result.data.reduce((sum, item) => sum + (item.images ? item.images.length : 0), 0);
            
            console.log(chalk.yellow(`有图片的记录: ${recordsWithImages.length} 条`));
            console.log(chalk.yellow(`总图片数: ${totalImages} 张`));
            
            // 显示前10条记录的简要信息
            console.log(chalk.blue(`\n=== 前10条记录 ===`));
            result.data.slice(0, 10).forEach((item, index) => {
                const imageCount = item.images ? item.images.length : 0;
                const status = imageCount > 0 ? chalk.green('✅') : chalk.red('❌');
                console.log(chalk.white(`${index + 1}. ${status} ${item.name} (${imageCount}张图片)`));
                if (item.description) {
                    console.log(chalk.gray(`   描述: ${item.description}`));
                }
                if (item.keywords) {
                    console.log(chalk.gray(`   关键词: ${item.keywords}`));
                }
            });
            
            if (result.data.length > 10) {
                console.log(chalk.gray(`\n... 还有 ${result.data.length - 10} 条记录`));
            }
            
            // 显示详细数据选项
            const showDetails = process.argv[3] === '--details';
            if (showDetails) {
                console.log(chalk.blue(`\n=== 详细数据 ===`));
                result.data.forEach((item, index) => {
                    console.log(chalk.blue(`\n[${index + 1}] ID: ${item.id}`));
                    console.log(chalk.white(`名称: ${item.name}`));
                    console.log(chalk.white(`描述: ${item.description || '无'}`));
                    console.log(chalk.white(`关键词: ${item.keywords || '无'}`));
                    console.log(chalk.white(`素材ID: ${item.materialId}`));
                    console.log(chalk.white(`模板组ID: ${item.templateGroup2DId}`));
                    console.log(chalk.white(`创建时间: ${new Date(item.createTime).toLocaleString()}`));
                    console.log(chalk.white(`更新时间: ${new Date(item.updateTime).toLocaleString()}`));
                    
                    if (item.images && item.images.length > 0) {
                        console.log(chalk.green(`图片数量: ${item.images.length}`));
                        console.log(chalk.gray('图片URLs:'));
                        item.images.forEach((url, imgIndex) => {
                            console.log(chalk.gray(`  ${imgIndex + 1}. ${url}`));
                        });
                    } else {
                        console.log(chalk.red('无可用图片'));
                    }
                    
                    console.log(chalk.gray('---'));
                });
            } else {
                console.log(chalk.cyan(`\n💡 使用 --details 参数查看详细数据:`));
                console.log(chalk.cyan(`node scripts/query-pending-social-media.js ${env} --details`));
            }
            
        } else {
            console.log(chalk.yellow('📭 暂无待发布社交媒体的数据'));
        }
        
        return result;
        
    } catch (error) {
        console.error(chalk.red('❌ 查询失败:'), error.message);
        if (error.response) {
            console.error(chalk.red('响应状态:'), error.response.status);
            console.error(chalk.red('响应数据:'), error.response.data);
        }
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        await queryPendingSocialMediaData();
        console.log(chalk.green('\n✅ 查询完成！'));
    } catch (error) {
        console.error(chalk.red('\n❌ 查询失败！'), error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export {
    queryPendingSocialMediaData
};
