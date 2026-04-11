import {
    runTemuLoginSmallFeature,
    runTemuSessionCollectSmallFeature
} from '../platforms/temu/smallFeatures.js';

const SMALL_FEATURE_REGISTRY = {
    'temu-login': {
        key: 'temu-login',
        name: 'Temu 登录',
        platform: 'temu',
        category: 'login',
        description: '打开 Temu 商家登录页，按账号登录流程填写账号密码、勾选协议并提交。',
        tips: [
            '默认会使用当前活动环境；传 profileId 时会优先作用到指定环境。',
            '默认执行后保留页面，方便继续观察登录结果和处理风控。'
        ],
        fields: [
            {
                key: 'account',
                label: '账号',
                type: 'text',
                required: true,
                placeholder: '请输入 Temu 账号'
            },
            {
                key: 'password',
                label: '密码',
                type: 'password',
                required: true,
                placeholder: '请输入 Temu 密码'
            },
            {
                key: 'profileId',
                label: '环境编号',
                type: 'text',
                required: false,
                placeholder: '可选，留空时使用当前活动环境'
            },
            {
                key: 'keepPageOpen',
                label: '保留页面',
                type: 'boolean',
                required: false,
                defaultValue: true
            }
        ],
        handler: runTemuLoginSmallFeature
    },
    'temu-session-collect': {
        key: 'temu-session-collect',
        name: 'Temu 会话采集',
        platform: 'temu',
        category: 'session',
        description: '只采集当前浏览器环境里已登录的 Temu 会话，返回 cookies、mallList、mallId、anti-content 和请求头模板。',
        tips: [
            '默认会使用当前活动环境；传 profileId 时会优先作用到指定环境。',
            '这个功能不会自动登录，也不需要输入账号密码。',
            '如需登录，请先单独执行 Temu 登录功能，或者让用户自己手动登录后再采集。',
            '默认会尽力补抓 global/us/eu 三套 cookies，但区域采集失败不会中断主流程。'
        ],
        fields: [
            {
                key: 'profileId',
                label: '环境编号',
                type: 'text',
                required: false,
                placeholder: '可选，留空时使用当前活动环境'
            },
            {
                key: 'collectRegionCookies',
                label: '采集区域 Cookie',
                type: 'boolean',
                required: false,
                defaultValue: true
            },
            {
                key: 'keepPageOpen',
                label: '保留页面',
                type: 'boolean',
                required: false,
                defaultValue: true
            }
        ],
        handler: runTemuSessionCollectSmallFeature
    }
};

export function listBrowserAutomationSmallFeatures() {
    return Object.values(SMALL_FEATURE_REGISTRY).map(({ handler, ...item }) => ({ ...item }));
}

export function getBrowserAutomationSmallFeature(featureKey) {
    return SMALL_FEATURE_REGISTRY[String(featureKey || '').trim()] || null;
}

export async function runBrowserAutomationSmallFeature(featureKey, payload = {}) {
    const feature = getBrowserAutomationSmallFeature(featureKey);
    if (!feature) {
        throw new Error(`不支持的工具: ${featureKey}`);
    }

    return await feature.handler(payload);
}

export default {
    listBrowserAutomationSmallFeatures,
    getBrowserAutomationSmallFeature,
    runBrowserAutomationSmallFeature
};
