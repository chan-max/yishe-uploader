/**
 * 重构后功能测试脚本
 */

import { PublishService } from './src/services/PublishService.js';
import { BasePublisher } from './src/services/BasePublisher.js';
import { ImageManager } from './src/services/ImageManager.js';
import { PageOperator } from './src/services/PageOperator.js';
import { DouyinLoginChecker, XiaohongshuLoginChecker, GenericLoginChecker } from './src/services/LoginChecker.js';
import { PLATFORM_CONFIGS } from './src/config/platforms.js';
import { logger } from './src/utils/logger.js';

/**
 * 测试通用服务
 */
async function testCommonServices() {
    logger.info('🧪 开始测试通用服务...');
    
    try {
        // 测试图片管理器
        logger.info('📸 测试图片管理器...');
        const imageManager = new ImageManager();
        logger.info('✅ 图片管理器初始化成功');
        
        // 测试页面操作器
        logger.info('🖱️ 测试页面操作器...');
        const pageOperator = new PageOperator();
        logger.info('✅ 页面操作器初始化成功');
        
        // 测试登录检查器
        logger.info('🔐 测试登录检查器...');
        const douyinChecker = new DouyinLoginChecker();
        const xiaohongshuChecker = new XiaohongshuLoginChecker();
        const genericChecker = new GenericLoginChecker('测试平台', {
            selectors: {
                userElements: ['.user'],
                loginElements: ['.login']
            }
        });
        logger.info('✅ 登录检查器初始化成功');
        
        logger.info('🎉 所有通用服务测试通过！');
        return true;
        
    } catch (error) {
        logger.error('❌ 通用服务测试失败:', error);
        return false;
    }
}

/**
 * 测试平台配置
 */
async function testPlatformConfigs() {
    logger.info('⚙️ 开始测试平台配置...');
    
    try {
        const platforms = Object.keys(PLATFORM_CONFIGS);
        logger.info(`📋 支持的平台: ${platforms.join(', ')}`);
        
        for (const platform of platforms) {
            const config = PLATFORM_CONFIGS[platform];
            logger.info(`🔧 ${platform} 配置:`);
            logger.info(`  - 名称: ${config.name}`);
            logger.info(`  - URL: ${config.uploadUrl}`);
            logger.info(`  - 反检测: ${config.antiDetection ? '是' : '否'}`);
            logger.info(`  - 登录检查: ${config.checkLogin ? '是' : '否'}`);
            logger.info(`  - 选择器数量: ${Object.keys(config.selectors).length}`);
        }
        
        logger.info('✅ 平台配置测试通过！');
        return true;
        
    } catch (error) {
        logger.error('❌ 平台配置测试失败:', error);
        return false;
    }
}

/**
 * 测试基础发布器
 */
async function testBasePublisher() {
    logger.info('🚀 开始测试基础发布器...');
    
    try {
        // 创建一个测试配置
        const testConfig = {
            name: '测试平台',
            uploadUrl: 'https://example.com',
            waitUntil: 'domcontentloaded',
            timeout: 30000,
            antiDetection: false,
            checkLogin: false,
            selectors: {
                contentInput: 'textarea',
                fileInput: 'input[type="file"]',
                submitButton: 'button[type="submit"]'
            },
            loginSelectors: {
                userElements: ['.user'],
                loginElements: ['.login']
            },
            preProcess: null,
            postProcess: null
        };
        
        // 创建测试发布器
        class TestPublisher extends BasePublisher {
            constructor() {
                super('测试平台', testConfig);
            }
            
            async publish(publishInfo) {
                logger.info('📝 测试发布器被调用');
                return { success: true, message: '测试发布成功' };
            }
        }
        
        const testPublisher = new TestPublisher();
        logger.info('✅ 基础发布器测试通过！');
        return true;
        
    } catch (error) {
        logger.error('❌ 基础发布器测试失败:', error);
        return false;
    }
}

/**
 * 测试发布服务
 */
async function testPublishService() {
    logger.info('📡 开始测试发布服务...');
    
    try {
        // 测试缓存功能
        const cacheInfo = PublishService.getCacheInfo();
        logger.info('💾 缓存信息:', cacheInfo);
        
        // 测试安全执行
        const safeResult = await PublishService.safeExecute(
            () => Promise.resolve('测试成功'),
            '测试操作'
        );
        logger.info('🛡️ 安全执行结果:', safeResult);
        
        logger.info('✅ 发布服务测试通过！');
        return true;
        
    } catch (error) {
        logger.error('❌ 发布服务测试失败:', error);
        return false;
    }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
    logger.info('🎯 开始运行重构后功能测试...');
    logger.info('=' * 50);
    
    const tests = [
        { name: '通用服务', fn: testCommonServices },
        { name: '平台配置', fn: testPlatformConfigs },
        { name: '基础发布器', fn: testBasePublisher },
        { name: '发布服务', fn: testPublishService }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
                logger.success(`✅ ${test.name} 测试通过`);
            } else {
                failed++;
                logger.error(`❌ ${test.name} 测试失败`);
            }
        } catch (error) {
            failed++;
            logger.error(`❌ ${test.name} 测试异常:`, error);
        }
        logger.info('-'.repeat(30));
    }
    
    logger.info('📊 测试结果汇总:');
    logger.info(`✅ 通过: ${passed}`);
    logger.info(`❌ 失败: ${failed}`);
    logger.info(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
        logger.success('🎉 所有测试通过！重构成功！');
    } else {
        logger.error('⚠️ 部分测试失败，请检查相关功能');
    }
    
    return failed === 0;
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        logger.error('测试运行异常:', error);
        process.exit(1);
    });
}

export { runAllTests };
