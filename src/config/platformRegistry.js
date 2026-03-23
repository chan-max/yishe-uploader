import { publishToDouyin } from '../platforms/douyin.js';
import { publishToKuaishou } from '../platforms/kuaishou.js';
import { publishToXiaohongshu } from '../platforms/xiaohongshu.js';
import { publishToWeibo } from '../platforms/weibo.js';
import { publishToYouTube } from '../platforms/youtube.js';
import { publishToXianyu } from '../platforms/xianyu.js';
import { publishToTiktok } from '../platforms/tiktok.js';
import { publishToDoudian } from '../platforms/doudian.js';
import { publishToKuaishouShop } from '../platforms/kuaishouShop.js';

const createCapability = (key, name, description, handler) => ({
    key,
    name,
    description,
    handler
});

export const PLATFORM_REGISTRY = {
    douyin: {
        id: 'douyin',
        name: '抖音',
        category: 'content',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布内容', '发布视频或图文内容', publishToDouyin)
        ]
    },
    kuaishou: {
        id: 'kuaishou',
        name: '快手',
        category: 'content',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布内容', '发布视频内容', publishToKuaishou)
        ]
    },
    xiaohongshu: {
        id: 'xiaohongshu',
        name: '小红书',
        category: 'content',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布内容', '发布图文或笔记内容', publishToXiaohongshu)
        ]
    },
    weibo: {
        id: 'weibo',
        name: '微博',
        category: 'content',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布内容', '发布微博内容', publishToWeibo)
        ]
    },
    youtube: {
        id: 'youtube',
        name: 'YouTube',
        category: 'content',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布内容', '发布视频内容', publishToYouTube)
        ]
    },
    xianyu: {
        id: 'xianyu',
        name: '咸鱼',
        category: 'commerce',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布商品', '发布闲置商品', publishToXianyu)
        ]
    },
    tiktok: {
        id: 'tiktok',
        name: 'TikTok',
        category: 'content',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布内容', '发布视频内容', publishToTiktok)
        ]
    },
    doudian: {
        id: 'doudian',
        name: '抖店',
        category: 'commerce',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布商品', '发布电商商品', publishToDoudian)
        ]
    },
    kuaishou_shop: {
        id: 'kuaishou_shop',
        name: '快手小店',
        category: 'commerce',
        defaultAction: 'publish',
        capabilities: [
            createCapability('publish', '发布商品', '发布电商商品', publishToKuaishouShop)
        ]
    }
};

export function getPlatformDefinition(platform) {
    return PLATFORM_REGISTRY[platform] || null;
}

export function getPlatformCatalog() {
    return Object.values(PLATFORM_REGISTRY).map((platform) => ({
        id: platform.id,
        name: platform.name,
        category: platform.category,
        defaultAction: platform.defaultAction,
        capabilities: platform.capabilities.map((capability) => ({
            key: capability.key,
            name: capability.name,
            description: capability.description
        }))
    }));
}

export function getSupportedPlatforms() {
    return Object.keys(PLATFORM_REGISTRY);
}

export function isPlatformSupported(platform) {
    return !!getPlatformDefinition(platform);
}

export function resolvePlatformCapability(platform, action = 'publish') {
    const definition = getPlatformDefinition(platform);
    if (!definition) return null;

    const targetAction = action || definition.defaultAction || 'publish';
    const capability = definition.capabilities.find((item) => item.key === targetAction);
    if (!capability) return null;

    return {
        platform: definition,
        capability
    };
}
