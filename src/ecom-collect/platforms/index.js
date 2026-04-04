import aliexpressPlatform from './aliexpress/index.js';
import amazonPlatform from './amazon/index.js';
import douyinShopPlatform from './douyin_shop/index.js';
import jdPlatform from './jd/index.js';
import sheinPlatform from './shein/index.js';
import taobaoPlatform from './taobao/index.js';
import temuPlatform from './temu/index.js';
import tiktokShopPlatform from './tiktok_shop/index.js';

const PLATFORM_LIST = [
    amazonPlatform,
    aliexpressPlatform,
    temuPlatform,
    tiktokShopPlatform,
    douyinShopPlatform,
    taobaoPlatform,
    jdPlatform,
    sheinPlatform,
];

export const PLATFORM_CONFIGS = Object.fromEntries(
    PLATFORM_LIST.map((item) => [item.platform, item]),
);

export function getPlatformCatalog() {
    return PLATFORM_LIST.map((item) => ({
        platform: item.platform,
        label: item.label,
        supportedScenes: Array.isArray(item.supportedScenes) ? [...item.supportedScenes] : [],
    }));
}

export function getPlatformConfig(platform) {
    return PLATFORM_CONFIGS[String(platform || '').trim()] || null;
}
