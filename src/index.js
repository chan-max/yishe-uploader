/**
 * Yishe Uploader - 多媒体自动发布脚本
 * 支持微博、抖音、小红书、快手等平台的自动化发布
 */

// 仅在开发环境或明确需要时禁用 TLS 验证
if (process.env.NODE_ENV === 'development' || process.env.DISABLE_TLS_VERIFY === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('⚠️  TLS 证书验证已禁用，仅用于开发环境');
}

import {
    program
} from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import inquirer from 'inquirer';
import {
    PublishService
} from './services/PublishService.js';
import {
    BrowserService
} from './services/BrowserService.js';
import {
    logger
} from './utils/logger.js';
import {
    createAxiosInstance,
    testHttpsConnection
} from './utils/network.js';

// 设置程序信息
program
    .name('yishe-uploader')
    .description('多媒体自动发布脚本 - 支持微博、抖音、小红书、快手等平台')
    .version('1.0.0');

// 解析命令行参数
const env = process.argv[2] === 'dev' ? 'dev' : 'prod';
const baseUrl = env === 'dev' ? 'http://localhost:1520' : 'https://1s.design:1520';

// 数据源配置
const DATA_SOURCES = {
    PRODUCT_IMAGE_2D: {
        name: '二维产品图',
        endpoint: '/api/product-image-2d/find-pending-social-media',
        description: '从二维产品图数据中获取待发布内容'
    },
    CUSTOM_MODEL: {
        name: '自定义模型',
        endpoint: '/api/custom-model/find-pending-social-media',
        description: '从自定义模型数据中获取待发布内容'
    }
};

// 创建不超时的 axios 实例
const axiosNoTimeout = createAxiosInstance({
    timeout: 0,
    useSecureHttps: true
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
 * 选择数据源
 */
async function selectDataSource() {
    const choices = Object.entries(DATA_SOURCES).map(([key, source]) => ({
        name: `${source.name} - ${source.description}`,
        value: key,
        short: source.name
    }));

    const answers = await inquirer.prompt([{
        type: 'list',
        name: 'dataSource',
        message: '请选择数据源:',
        choices: choices,
        default: 'PRODUCT_IMAGE_2D'
    }]);

    return answers.dataSource;
}

/**
 * 测试网络连接
 */
async function testNetworkConnection() {
    try {
        logger.info('正在测试网络连接...');

        // 测试基本网络连接
        const networkTest = await testHttpsConnection('https://www.baidu.com');
        if (!networkTest.success) {
            logger.warn('基本网络连接测试失败:', networkTest.message);
        } else {
            logger.info('✅ 基本网络连接正常');
        }

        // 测试目标服务器连接
        const serverTest = await testHttpsConnection(baseUrl);
        if (!serverTest.success) {
            logger.error('❌ 目标服务器连接失败:', serverTest.message);
            throw new Error(`无法连接到服务器: ${baseUrl}`);
        } else {
            logger.info('✅ 目标服务器连接正常');
            if (serverTest.warning) {
                logger.warn('⚠️ ', serverTest.warning);
            }
        }

        return true;
    } catch (error) {
        logger.error('网络连接测试失败:', error.message);
        throw error;
    }
}
async function getPendingData(dataSource = 'PRODUCT_IMAGE_2D') {
    try {
        const sourceConfig = DATA_SOURCES[dataSource];
        logger.info(`正在从 ${sourceConfig.name} 获取待发布数据...`);

        const response = await axiosNoTimeout.post(`${baseUrl}${sourceConfig.endpoint}`, {
            limit: 1000
        });

        const result = response.data.data;

        if (result.data && result.data.length > 0) {
            const universalData = convertToUniversalStructure(result.data);
            logger.info(`成功获取 ${universalData.length} 条待发布数据 (来源: ${sourceConfig.name})`);
            return universalData;
        } else {
            logger.info(`暂无待发布数据 (来源: ${sourceConfig.name})`);
            return [];
        }

    } catch (error) {
        logger.error('获取待发布数据失败:', error.message);
        throw error;
    }
}

/**
 * 检查平台登录状态
 */
async function checkPlatformLoginStatus() {
    try {
        logger.info('正在检查各平台登录状态...');
        const loginStatus = await PublishService.checkSocialMediaLoginStatus();

        const loggedInPlatforms = [];
        const notLoggedInPlatforms = [];

        Object.entries(loginStatus).forEach(([platform, status]) => {
            if (status.isLoggedIn) {
                loggedInPlatforms.push(platform);
                logger.info(`✅ ${platform}: 已登录`);
            } else {
                notLoggedInPlatforms.push(platform);
                logger.warn(`❌ ${platform}: 未登录 - ${status.message}`);
            }
        });

        return {
            loggedInPlatforms,
            notLoggedInPlatforms,
            loginStatus
        };
    } catch (error) {
        logger.error('检查登录状态失败:', error.message);
        throw error;
    }
}

/**
 * 发布单条数据到指定平台
 */
async function publishToPlatform(platform, item) {
    try {
        logger.info(`开始发布到 ${platform}: ${item.title}`);

        const config = {
            platform,
            title: item.title,
            content: item.content,
            images: item.images,
            tags: item.tags
        };

        const result = await PublishService.publishSingle(config);

        if (result.success) {
            logger.info(`✅ ${platform} 发布成功: ${result.message}`);
        } else {
            logger.error(`❌ ${platform} 发布失败: ${result.message}`);
        }

        return {
            success: result.success,
            message: result.message,
            platform,
            itemId: item.id
        };
    } catch (error) {
        logger.error(`${platform} 发布异常:`, error.message);
        return {
            success: false,
            message: error.message,
            platform,
            itemId: item.id
        };
    }
}

/**
 * 发布单条数据到所有已登录平台
 */
async function publishItemToAllPlatforms(item, loggedInPlatforms) {
    const results = [];

    logger.info(`\n📝 开始发布数据: ${item.title}`);
    logger.info(`📊 数据ID: ${item.id}`);
    logger.info(`🖼️  图片数量: ${item.images.length}`);
    logger.info(`🏷️  标签: ${item.tags.join(', ')}`);
    logger.info(`🎯 目标平台: ${loggedInPlatforms.join(', ')}`);

    for (const platform of loggedInPlatforms) {
        const result = await publishToPlatform(platform, item);
        results.push(result);

        // 平台间发布间隔
        if (platform !== loggedInPlatforms[loggedInPlatforms.length - 1]) {
            logger.info('等待3秒后继续下一个平台...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    return results;
}

/**
 * 主发布流程
 */
async function mainPublishFlow(options = {}) {
    const spinner = ora('正在初始化发布流程...').start();

    try {
        // 1. 选择数据源
        let dataSource = options.dataSource;
        if (!dataSource) {
            spinner.stop();
            dataSource = await selectDataSource();
            spinner.start('正在初始化发布流程...');
        }

        // 2. 测试网络连接
        spinner.text = '正在测试网络连接...';
        await testNetworkConnection();

        // 3. 获取待发布数据
        spinner.text = '正在获取待发布数据...';
        const pendingData = await getPendingData(dataSource);

        if (pendingData.length === 0) {
            spinner.succeed('暂无待发布数据');
            return;
        }

        spinner.text = '正在检查登录状态...';

        // 2. 检查登录状态
        const {
            loggedInPlatforms,
            notLoggedInPlatforms
        } = await checkPlatformLoginStatus();

        if (loggedInPlatforms.length === 0) {
            spinner.fail('没有已登录的平台，请先登录');
            logger.error('所有平台都未登录，无法进行发布');
            return;
        }

        if (notLoggedInPlatforms.length > 0) {
            logger.warn(`以下平台未登录，将跳过: ${notLoggedInPlatforms.join(', ')}`);
        }

        spinner.succeed(`准备就绪，将发布 ${pendingData.length} 条数据到 ${loggedInPlatforms.length} 个平台`);

        // 3. 逐条发布数据
        const allResults = [];
        let successCount = 0;
        let totalCount = 0;

        for (let i = 0; i < pendingData.length; i++) {
            const item = pendingData[i];
            logger.info(`\n📋 处理第 ${i + 1}/${pendingData.length} 条数据`);

            const results = await publishItemToAllPlatforms(item, loggedInPlatforms);
            allResults.push(...results);

            // 统计结果
            const itemSuccessCount = results.filter(r => r.success).length;
            successCount += itemSuccessCount;
            totalCount += results.length;

            logger.info(`📊 第 ${i + 1} 条数据发布完成: ${itemSuccessCount}/${results.length} 个平台成功`);

            // 数据间发布间隔
            if (i < pendingData.length - 1) {
                logger.info('等待5秒后处理下一条数据...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // 4. 显示最终结果
        logger.info('\n🎉 所有数据发布完成！');
        logger.info(`📈 总体成功率: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);

        // 按平台统计
        const platformStats = {};
        allResults.forEach(result => {
            if (!platformStats[result.platform]) {
                platformStats[result.platform] = {
                    success: 0,
                    total: 0
                };
            }
            platformStats[result.platform].total++;
            if (result.success) {
                platformStats[result.platform].success++;
            }
        });

        logger.info('\n📊 各平台发布统计:');
        Object.entries(platformStats).forEach(([platform, stats]) => {
            const rate = ((stats.success / stats.total) * 100).toFixed(1);
            logger.info(`  ${platform}: ${stats.success}/${stats.total} (${rate}%)`);
        });

    } catch (error) {
        spinner.fail('发布流程失败');
        logger.error('发布流程出错:', error.message);
        process.exit(1);
    } finally {
        // 保持浏览器开启，便于继续操作
        logger.info('✅ 发布流程完成，浏览器保持开启状态');
    }
}

// 主命令
program
    .command('start')
    .description('启动自动发布流程 - 获取服务器数据并发布到各平台')
    .option('--env <env>', '环境选择 (dev|prod)', 'dev')
    .option('--source <source>', '数据源选择 (product-image-2d|custom-model)', '')
    .action(async (options) => {
        // 转换数据源参数
        let dataSource = '';
        if (options.source) {
            switch (options.source.toLowerCase()) {
                case 'product-image-2d':
                case 'product':
                    dataSource = 'PRODUCT_IMAGE_2D';
                    break;
                case 'custom-model':
                case 'custom':
                    dataSource = 'CUSTOM_MODEL';
                    break;
                default:
                    logger.warn(`未知的数据源: ${options.source}，将使用交互式选择`);
            }
        }

        await mainPublishFlow({
            dataSource
        });
    });

// 发布命令
program
    .command('publish')
    .description('发布内容到社交媒体平台')
    .option('--file <file>', '从 JS/JSON 文件加载发布配置对象')
    .option('-p, --platform <platform>', '指定平台 (weibo|douyin|xiaohongshu|kuaishou)')
    .option('-P, --platforms <platforms>', '指定多个平台，用逗号分隔')
    .option('-t, --title <title>', '发布标题')
    .option('-c, --content <content>', '发布内容')
    .option('-i, --images <images>', '图片URL，用逗号分隔')
    .option('--tags <tags>', '标签，用逗号分隔')
    .option('--headless', '无头模式运行浏览器')
    .option('--test', '测试模式，不实际发布')
    .action(async (options) => {
        const spinner = ora('正在初始化发布服务...').start();

        try {
            let publishConfigs = [];
            if (options.file) {
                // 从文件加载对象
                const {
                    resolve
                } = await import('path');
                const {
                    pathToFileURL
                } = await import('url');
                const resolved = resolve(process.cwd(), options.file);
                const mod = await import(pathToFileURL(resolved).href);
                const data = mod.default ? ? mod.config ? ? mod.publish ? ? mod;
                if (Array.isArray(data)) {
                    publishConfigs = data;
                } else if (data && Array.isArray(data.platforms)) {
                    publishConfigs = data.platforms;
                } else {
                    spinner.fail('文件格式不正确：应导出数组或包含 platforms 数组的对象');
                    process.exit(1);
                }
            } else {
                // 验证参数（命令行模式）
                if (!options.platform && !options.platforms) {
                    spinner.fail('请指定要发布的平台，或使用 --file 指定配置文件');
                    process.exit(1);
                }

                if (!options.title && !options.content) {
                    spinner.fail('请提供标题或内容，或使用 --file 指定配置文件');
                    process.exit(1);
                }

                // 解析平台列表
                const platforms = options.platforms ?
                    options.platforms.split(',').map(p => p.trim()) : [options.platform];

                // 解析图片列表
                const images = options.images ?
                    options.images.split(',').map(img => img.trim()) : [];

                // 解析标签列表
                const tags = options.tags ?
                    options.tags.split(',').map(tag => tag.trim()) : [];

                // 构建发布配置
                publishConfigs = platforms.map(platform => ({
                    platform,
                    title: options.title || '',
                    content: options.content || '',
                    images,
                    tags
                }));
            }

            spinner.text = '正在检查登录状态...';

            // 检查登录状态
            const loginStatus = await PublishService.checkSocialMediaLoginStatus();

            // 显示登录状态
            console.log('\n📱 登录状态检查结果:');
            Object.entries(loginStatus).forEach(([platform, status]) => {
                const icon = status.isLoggedIn ? '✅' : '❌';
                const color = status.isLoggedIn ? chalk.green : chalk.red;
                console.log(`  ${icon} ${color(platform)}: ${status.message}`);
            });

            if (options.test) {
                spinner.succeed('测试模式 - 跳过实际发布');
                console.log('\n📋 发布配置预览:');
                publishConfigs.forEach(config => {
                    console.log(`\n🎯 平台: ${config.platform}`);
                    console.log(`📝 标题: ${config.title}`);
                    console.log(`📄 内容: ${config.content}`);
                    console.log(`🖼️  图片: ${config.images.length} 张`);
                    console.log(`🏷️  标签: ${config.tags.join(', ')}`);
                });
                return;
            }

            spinner.text = '正在发布内容...';

            // 执行发布（逐个平台）。不关闭浏览器，便于继续操作
            const results = [];
            for (const cfg of publishConfigs) {
                const r = await PublishService.publishSingle(cfg);
                results.push(r);
            }

            spinner.succeed('发布完成');

            // 显示发布结果
            console.log('\n📊 发布结果:');
            results.forEach(result => {
                const icon = result.success ? '✅' : '❌';
                const color = result.success ? chalk.green : chalk.red;
                console.log(`  ${icon} ${color(result.platform)}: ${result.message}`);
            });

            const successCount = results.filter(r => r.success).length;
            const totalCount = results.length;
            console.log(`\n📈 成功率: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);

        } catch (error) {
            spinner.fail('发布失败');
            logger.error('发布过程出错:', error);
            process.exit(1);
        } finally {
            // 不清理浏览器，便于继续操作或继续上传
        }
    });

// 检查登录状态命令
program
    .command('check-login')
    .description('检查各平台登录状态')
    .option('--force', '强制刷新登录状态')
    .action(async (options) => {
        const spinner = ora('正在检查登录状态...').start();

        try {
            const loginStatus = await PublishService.checkSocialMediaLoginStatus(options.force);

            spinner.succeed('登录状态检查完成');

            console.log('\n📱 登录状态:');
            Object.entries(loginStatus).forEach(([platform, status]) => {
                const icon = status.isLoggedIn ? '✅' : '❌';
                const color = status.isLoggedIn ? chalk.green : chalk.red;
                console.log(`  ${icon} ${color(platform)}: ${status.message}`);
            });

        } catch (error) {
            spinner.fail('检查登录状态失败');
            logger.error('检查登录状态出错:', error);
            process.exit(1);
        } finally {
            // 不清理浏览器，便于继续操作或继续上传
        }
    });

// 数据源查询命令
program
    .command('query')
    .description('查询指定数据源的待发布数据')
    .option('--source <source>', '数据源选择 (product-image-2d|custom-model)', '')
    .option('--env <env>', '环境选择 (dev|prod)', 'dev')
    .action(async (options) => {
        const spinner = ora('正在查询数据...').start();

        try {
            // 选择数据源
            let dataSource = '';
            if (options.source) {
                switch (options.source.toLowerCase()) {
                    case 'product-image-2d':
                    case 'product':
                        dataSource = 'PRODUCT_IMAGE_2D';
                        break;
                    case 'custom-model':
                    case 'custom':
                        dataSource = 'CUSTOM_MODEL';
                        break;
                    default:
                        logger.warn(`未知的数据源: ${options.source}，将使用交互式选择`);
                }
            }

            if (!dataSource) {
                spinner.stop();
                dataSource = await selectDataSource();
                spinner.start('正在查询数据...');
            }

            const pendingData = await getPendingData(dataSource);

            if (pendingData.length === 0) {
                spinner.succeed('暂无待发布数据');
                return;
            }

            spinner.succeed(`查询完成，共找到 ${pendingData.length} 条待发布数据`);

            // 显示数据预览
            console.log('\n📋 数据预览:');
            pendingData.slice(0, 5).forEach((item, index) => {
                console.log(`\n${index + 1}. ${chalk.bold(item.title)}`);
                console.log(`   ID: ${item.id}`);
                console.log(`   内容: ${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}`);
                console.log(`   图片: ${item.images.length} 张`);
                console.log(`   标签: ${item.tags.join(', ')}`);
            });

            if (pendingData.length > 5) {
                console.log(`\n... 还有 ${pendingData.length - 5} 条数据`);
            }

        } catch (error) {
            spinner.fail('查询数据失败');
            logger.error('查询数据出错:', error);
            process.exit(1);
        }
    });

// 测试命令
program
    .command('test')
    .description('测试发布功能')
    .option('-p, --platform <platform>', '测试指定平台')
    .action(async (options) => {
        const spinner = ora('正在执行测试...').start();

        try {
            const testContent = {
                platform: options.platform || 'douyin',
                title: '测试发布',
                content: '这是一条测试发布内容，用于验证发布功能。',
                images: ['https://picsum.photos/800/600?random=1'],
                tags: ['测试', '发布']
            };

            spinner.text = '正在测试发布...';
            const results = [await PublishService.publishSingle(testContent)];

            spinner.succeed('测试完成');

            results.forEach(result => {
                const icon = result.success ? '✅' : '❌';
                const color = result.success ? chalk.green : chalk.red;
                console.log(`  ${icon} ${color(result.platform)}: ${result.message}`);
            });

        } catch (error) {
            spinner.fail('测试失败');
            logger.error('测试过程出错:', error);
            process.exit(1);
        } finally {
            await BrowserService.cleanup();
        }
    });

// 浏览器管理命令
program
    .command('browser')
    .description('浏览器管理')
    .option('--status', '查看浏览器状态')
    .option('--close', '关闭浏览器')
    .option('--clear-data', '清除用户数据')
    .action(async (options) => {
        if (options.status) {
            const status = await BrowserService.getStatus();
            console.log('🔍 浏览器状态:', status);
        } else if (options.close) {
            const spinner = ora('正在关闭浏览器...').start();
            await BrowserService.close();
            spinner.succeed('浏览器已关闭');
        } else if (options.clearData) {
            const spinner = ora('正在清除用户数据...').start();
            await BrowserService.clearUserData();
            spinner.succeed('用户数据已清除');
        } else {
            console.log('请指定操作: --status, --close, 或 --clear-data');
        }
    });

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助信息
if (!process.argv.slice(2).length) {
    program.outputHelp();
}