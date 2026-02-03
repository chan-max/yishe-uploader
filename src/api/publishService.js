/**
 * 统一发布服务 - API封装层
 * 提供统一的接口供前端和外部调用
 */

import { publishToDouyin } from '../platforms/douyin.js';
import { publishToKuaishou } from '../platforms/kuaishou.js';
import { publishToXiaohongshu } from '../platforms/xiaohongshu.js';
import { publishToWeibo } from '../platforms/weibo.js';
import { logger } from '../utils/logger.js';

/**
 * 平台发布器映射
 */
const platformPublishers = {
    douyin: publishToDouyin,
    kuaishou: publishToKuaishou,
    xiaohongshu: publishToXiaohongshu,
    weibo: publishToWeibo,
    // 其他平台可以继续添加
    // tencent: publishToTencent,
    // bilibili: publishToBilibili,
    // tiktok: publishToTikTok,
    // baijiahao: publishToBaijiahao
};

/**
 * 发布服务类
 */
class PublishService {
    /**
     * 发布到单个平台
     * @param {string} platform - 平台ID
     * @param {Object} publishInfo - 发布信息
     * @returns {Promise<Object>} 发布结果
     */
    async publishToPlatform(platform, publishInfo) {
        try {
            logger.info(`开始发布到平台: ${platform}`);
            
            // 获取对应平台的发布器
            const publisher = platformPublishers[platform];
            
            if (!publisher) {
                throw new Error(`不支持的平台: ${platform}`);
            }
            
            // 执行发布
            const result = await publisher(publishInfo);
            
            logger.info(`平台 ${platform} 发布结果:`, result);
            
            return {
                platform,
                ...result,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            logger.error(`平台 ${platform} 发布失败:`, error);
            
            return {
                platform,
                success: false,
                message: error.message || '发布失败',
                error: error,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 批量发布到多个平台
     * @param {Array<string>} platforms - 平台ID列表
     * @param {Object} publishInfo - 发布信息
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 批量发布结果
     */
    async batchPublish(platforms, publishInfo, options = {}) {
        try {
            logger.info(`开始批量发布到 ${platforms.length} 个平台`);
            
            const results = [];
            const { concurrent = false } = options;
            
            if (concurrent) {
                // 并发发布
                logger.info('使用并发模式发布');
                const promises = platforms.map(platform => 
                    this.publishToPlatform(platform, publishInfo)
                );
                const platformResults = await Promise.allSettled(promises);
                
                platformResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                    } else {
                        results.push({
                            platform: platforms[index],
                            success: false,
                            message: result.reason?.message || '发布失败',
                            error: result.reason,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            } else {
                // 顺序发布
                logger.info('使用顺序模式发布');
                for (const platform of platforms) {
                    const result = await this.publishToPlatform(platform, publishInfo);
                    results.push(result);
                    
                    // 平台间间隔，避免频繁操作
                    if (platforms.indexOf(platform) < platforms.length - 1) {
                        await this.delay(2000);
                    }
                }
            }
            
            // 统计结果
            const successCount = results.filter(r => r.success).length;
            const failedCount = results.filter(r => !r.success).length;
            
            logger.info(`批量发布完成: 成功 ${successCount}/${platforms.length}, 失败 ${failedCount}/${platforms.length}`);
            
            return {
                success: successCount > 0,
                total: platforms.length,
                successCount,
                failedCount,
                results,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            logger.error('批量发布失败:', error);
            
            return {
                success: false,
                message: error.message || '批量发布失败',
                error: error,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 创建定时发布任务
     * @param {Array<string>} platforms - 平台ID列表
     * @param {Object} publishInfo - 发布信息
     * @param {Date} scheduleTime - 定时时间
     * @returns {Promise<Object>} 任务创建结果
     */
    async createScheduleTask(platforms, publishInfo, scheduleTime) {
        try {
            logger.info(`创建定时发布任务，计划时间: ${scheduleTime}`);
            
            const taskId = `task_${Date.now()}`;
            const delay = new Date(scheduleTime).getTime() - Date.now();
            
            if (delay < 0) {
                throw new Error('定时时间必须是未来时间');
            }
            
            // 设置定时器
            setTimeout(async () => {
                logger.info(`执行定时任务: ${taskId}`);
                await this.batchPublish(platforms, publishInfo);
            }, delay);
            
            return {
                success: true,
                taskId,
                scheduleTime,
                platforms,
                message: '定时任务创建成功'
            };
            
        } catch (error) {
            logger.error('创建定时任务失败:', error);
            
            return {
                success: false,
                message: error.message || '创建定时任务失败',
                error: error
            };
        }
    }

    /**
     * 获取支持的平台列表
     * @returns {Array<string>} 平台ID列表
     */
    getSupportedPlatforms() {
        return Object.keys(platformPublishers);
    }

    /**
     * 检查平台是否支持
     * @param {string} platform - 平台ID
     * @returns {boolean} 是否支持
     */
    isPlatformSupported(platform) {
        return platform in platformPublishers;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 创建单例实例
const publishService = new PublishService();

export default publishService;

/**
 * 导出便捷方法
 */
export const publishToPlatform = (platform, publishInfo) => 
    publishService.publishToPlatform(platform, publishInfo);

export const batchPublish = (platforms, publishInfo, options) => 
    publishService.batchPublish(platforms, publishInfo, options);

export const createScheduleTask = (platforms, publishInfo, scheduleTime) => 
    publishService.createScheduleTask(platforms, publishInfo, scheduleTime);

export const getSupportedPlatforms = () => 
    publishService.getSupportedPlatforms();

export const isPlatformSupported = (platform) => 
    publishService.isPlatformSupported(platform);
