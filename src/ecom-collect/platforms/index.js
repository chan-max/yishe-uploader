import aliexpressPlatform from './aliexpress/index.js';
import alibaba1688Platform from './alibaba_1688/index.js';
import amazonPlatform from './amazon/index.js';
import douyinShopPlatform from './douyin_shop/index.js';
import ebayPlatform from './ebay/index.js';
import googleTrendsPlatform from './google_trends/index.js';
import jdPlatform from './jd/index.js';
import mercadolibrePlatform from './mercadolibre/index.js';
import neweggPlatform from './newegg/index.js';
import ozonPlatform from './ozon/index.js';
import sheinPlatform from './shein/index.js';
import taobaoPlatform from './taobao/index.js';
import temuPlatform from './temu/index.js';
import tiktokShopPlatform from './tiktok_shop/index.js';
import walmartPlatform from './walmart/index.js';
import {
    buildPlatformCapability,
    ECOM_CAPABILITY_STATUS_META,
} from './shared.js';

const PLATFORM_LIST = [
    alibaba1688Platform,
    amazonPlatform,
    googleTrendsPlatform,
    ebayPlatform,
    neweggPlatform,
    walmartPlatform,
    aliexpressPlatform,
    temuPlatform,
    tiktokShopPlatform,
    douyinShopPlatform,
    taobaoPlatform,
    jdPlatform,
    sheinPlatform,
    ozonPlatform,
    mercadolibrePlatform,
];

export const PLATFORM_CONFIGS = Object.fromEntries(
    PLATFORM_LIST.map((item) => [item.platform, item]),
);

export function getPlatformCatalog() {
    return getPlatformCapabilities().map((item) => ({
        value: item.value,
        platform: item.value,
        label: item.label,
        regions: item.regions,
        supportedScenes: Array.isArray(item.supportedScenes) ? [...item.supportedScenes] : [],
        status: item.status,
        statusLabel: item.statusLabel,
        runnable: item.runnable,
        reason: item.reason,
        scenes: Array.isArray(item.scenes) ? item.scenes : [],
        docs: item.docs || {},
        maintenance: item.maintenance || {},
    }));
}

export function getPlatformConfig(platform) {
    return PLATFORM_CONFIGS[String(platform || '').trim()] || null;
}

function cloneValue(input) {
    if (input === undefined) {
        return undefined;
    }
    return JSON.parse(JSON.stringify(input));
}

function normalizePlatformCapability(item) {
    const capability =
        item?.capability && typeof item.capability === 'object'
            ? cloneValue(item.capability)
            : buildPlatformCapability({});
    const scenes = Array.isArray(capability.scenes) ? capability.scenes : [];
    const supportedScenes = Array.from(
        new Set(
            scenes
                .map((scene) => String(scene?.value || '').trim())
                .filter(Boolean),
        ),
    );
    const status = String(capability.status || 'heuristic').trim() || 'heuristic';
    const statusMeta = ECOM_CAPABILITY_STATUS_META[status] || ECOM_CAPABILITY_STATUS_META.heuristic;

    return {
        value: item.platform,
        platform: item.platform,
        label: item.label,
        regions: Array.isArray(capability.regions) ? capability.regions : ['global'],
        status,
        statusLabel: capability.statusLabel || statusMeta.label,
        runnable:
            capability.runnable !== undefined
                ? !!capability.runnable
                : scenes.some((scene) => scene?.runnable !== false),
        reason: String(capability.reason || '').trim() || null,
        supportedScenes,
        scenes,
        docs: capability.docs || {},
        maintenance: capability.maintenance || {},
        verification:
            item?.verification && typeof item.verification === 'object'
                ? cloneValue(item.verification)
                : {},
    };
}

export function getPlatformCapabilities() {
    return PLATFORM_LIST.map((item) => normalizePlatformCapability(item));
}

export function getPlatformCapability(platform) {
    return getPlatformCapabilities().find(
        (item) => item.value === String(platform || '').trim(),
    ) || null;
}
