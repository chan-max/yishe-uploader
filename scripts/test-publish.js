/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/test-publish.js
 * @Description: 测试发布脚本 - 使用模拟数据测试多平台发布
 */

import { PublishService } from '../src/services/PublishService.js';
import { publishWeiboItem } from './publish-weibo.js';
import { publishXiaohongshuItem } from './publish-xiaohongshu.js';
import { publishDouyinItem } from './publish-douyin.js';
import { publishKuaishouItem } from './publish-kuaishou.js';

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const testIndex = parseInt(process.argv[3]) || 0; // 默认使用第一个测试数据
const platforms = process.argv[4] ? process.argv[4].split(',') : ['xiaohongshu', 'weibo']; // 默认测试小红书和微博，小红书优先

/**
 * 测试数据结构
 */
const testData = [
    {
        id: 'test-001',
        title: '春季新品上市 - 时尚潮流单品',
        content: '春天来了！我们精心挑选的时尚单品正式上市，简约而不失优雅的设计，让你在春日里散发独特魅力。每一件单品都经过精心设计，注重细节和质感。',
        tags: ['春季新品', '时尚潮流', '简约设计', '品质生活'],
        images: [
            'https://picsum.photos/800/600?random=3001',
            'https://picsum.photos/800/600?random=3002'
        ],
        materialId: 'material-test-001',
        templateGroupId: 'template-test-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'test-002',
        title: '夏日清凉系列 - 舒适体验',
        content: '炎炎夏日，我们为你带来清凉舒适的体验。采用优质面料，透气性极佳，让你在高温天气中依然保持清爽。无论是居家还是外出，都能感受到贴心的舒适。',
        tags: ['夏日清凉', '舒适体验', '优质面料', '透气清爽'],
        images: [
            'https://picsum.photos/800/600?random=3003',
            'https://picsum.photos/800/600?random=3004',
            'https://picsum.photos/800/600?random=3005'
        ],
        materialId: 'material-test-002',
        templateGroupId: 'template-test-002',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'test-003',
        title: '秋季限定款 - 温暖如初',
        content: '秋风起，叶飘零。我们的秋季限定款温暖如初，精选优质材料，匠心工艺，为你带来温暖舒适的体验。每一处细节都体现着对品质的追求和对用户的关怀。',
        tags: ['秋季限定', '温暖舒适', '匠心工艺', '品质追求'],
        images: [
            'https://picsum.photos/800/600?random=3006'
        ],
        materialId: 'material-test-003',
        templateGroupId: 'template-test-003',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'test-004',
        title: '冬日暖心系列 - 温暖整个冬天',
        content: '雪花飞舞的冬日，我们的暖心系列为你带来温暖。厚实的面料，精心的设计，让你在寒冷的冬天也能感受到家的温暖。选择我们，选择温暖。',
        tags: ['冬日暖心', '温暖冬天', '厚实面料', '家的温暖'],
        images: [
            'https://picsum.photos/800/600?random=3007',
            'https://picsum.photos/800/600?random=3008'
        ],
        materialId: 'material-test-004',
        templateGroupId: 'template-test-004',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'test-005',
        title: '节日特惠 - 限时优惠不容错过',
        content: '节日特惠活动火热进行中！限时优惠，错过再等一年。精选商品，超值价格，让你在节日里享受购物的乐趣。数量有限，先到先得！',
        tags: ['节日特惠', '限时优惠', '超值价格', '先到先得'],
        images: [
            'https://picsum.photos/800/600?random=3009',
            'https://picsum.photos/800/600?random=3010',
            'https://picsum.photos/800/600?random=3011',
            'https://picsum.photos/800/600?random=3012'
        ],
        materialId: 'material-test-005',
        templateGroupId: 'template-test-005',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

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
 * 批量发布到多个平台
 */
async function publishToMultiplePlatforms(item, targetPlatforms) {
    const results = [];
    
    console.log(`\n开始测试发布: ${item.title}`);
    console.log(`测试数据ID: ${item.id}`);
    console.log(`图片数量: ${item.images.length}`);
    console.log(`标签: ${item.tags.join(', ')}`);
    console.log(`目标平台: ${targetPlatforms.join(', ')}`);
    console.log('─'.repeat(50));
    
    for (const platform of targetPlatforms) {
        console.log(`\n正在发布到 ${platform}...`);
        const result = await publishToPlatform(platform, item);
        results.push(result);
        
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} ${platform}: ${result.message}`);
        
        // 平台间发布间隔
        if (platform !== targetPlatforms[targetPlatforms.length - 1]) {
            console.log('等待2秒后继续...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    return results;
}

/**
 * 显示测试数据列表
 */
function showTestDataList() {
    console.log('\n📋 可用的测试数据:');
    console.log('─'.repeat(50));
    testData.forEach((item, index) => {
        console.log(`${index}. ${item.title}`);
        console.log(`   ID: ${item.id}`);
        console.log(`   图片: ${item.images.length}张`);
        console.log(`   标签: ${item.tags.join(', ')}`);
        console.log('');
    });
}

/**
 * 主函数
 */
async function main() {
    try {
        // 检查是否显示测试数据列表
        if (process.argv.includes('--list')) {
            showTestDataList();
            return;
        }

        // 检查测试数据索引是否有效
        if (testIndex >= testData.length) {
            console.log(`测试数据索引 ${testIndex} 超出范围，总共 ${testData.length} 条测试数据`);
            console.log('使用 --list 参数查看所有可用的测试数据');
            return;
        }

        const testItem = testData[testIndex];
        const results = await publishToMultiplePlatforms(testItem, platforms);
        
        // 统计结果
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        console.log('\n' + '═'.repeat(50));
        console.log(`📊 测试发布完成: ${successCount}/${totalCount} 个平台成功`);
        console.log('═'.repeat(50));
        
        // 显示详细结果
        results.forEach(result => {
            const icon = result.success ? '✅' : '❌';
            console.log(`${icon} ${result.platform}: ${result.message}`);
        });
        
        console.log('\n💡 提示:');
        console.log('- 使用 --list 参数查看所有测试数据');
        console.log('- 使用 node scripts/test-publish.js dev 0 weibo,xiaohongshu 指定平台');
        console.log('- 使用 node scripts/test-publish.js dev 1 选择不同的测试数据');
        
    } catch (error) {
        console.error('测试发布失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export { testData, publishToMultiplePlatforms, publishToPlatform };
