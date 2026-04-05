import {
    buildPlatformCapability,
    buildProductDetailSceneCapability,
    buildSearchSceneCapability,
    buildShopHotProductsSceneCapability,
    DEFAULT_SUPPORTED_SCENES,
} from '../shared.js';
import {
    temuProductDetailScene,
    temuSearchScene,
    temuShopHotProductsScene,
} from './selectors.js';

const temuPlatform = {
    platform: 'temu',
    label: 'Temu',
    supportedScenes: DEFAULT_SUPPORTED_SCENES,
    search: temuSearchScene,
    productDetail: temuProductDetailScene,
    shopHotProducts: temuShopHotProductsScene,
    verification: {
        search: 'heuristic',
        product_detail: 'heuristic',
        shop_hot_products: 'heuristic',
    },
    capability: buildPlatformCapability({
        regions: ['global'],
        status: 'heuristic',
        overview:
            'Temu 平台已经接入独立模块，但页面风控和地区跳转较重，当前以启发式可用为主。',
        notes: ['建议先在少量关键词与固定目标页上验证，再扩大任务规模。'],
        moduleDir: 'src/ecom-collect/platforms/temu',
        selectorFile: 'src/ecom-collect/platforms/temu/selectors.js',
        readmeFile: 'src/ecom-collect/platforms/temu/README.md',
        maintenanceNotes: [
            '如后续要支持更多市场，可继续在平台模块内扩地区或市场参数。',
        ],
        scenes: [
            buildSearchSceneCapability({
                verification: 'heuristic',
                availability: 'heuristic',
                keywordPlaceholder: '例如：home decor',
                keywordsPlaceholder: '按关键词拆分任务，便于失败时回溯',
                overview: 'Temu 搜索页目前通过启发式方式抓取卡片数据。',
                examples: [
                    {
                        title: 'Temu 搜索采集',
                        payload: {
                            platform: 'temu',
                            collectScene: 'search',
                            configData: {
                                keyword: 'home decor',
                                maxPages: 2,
                                maxItems: 60,
                            },
                        },
                    },
                ],
            }),
            buildProductDetailSceneCapability({
                verification: 'heuristic',
                availability: 'heuristic',
                targetUrlPlaceholder: '填写 Temu 商品详情页链接',
                overview: '详情场景已接入，适合在固定商品页做持续回归。',
                examples: [
                    {
                        title: 'Temu 商品详情采集',
                        payload: {
                            platform: 'temu',
                            collectScene: 'product_detail',
                            configData: {
                                targetUrl: 'https://www.temu.com/goods.html?_bg_fs=1&goods_id=601099512345678.html',
                            },
                        },
                    },
                ],
            }),
            buildShopHotProductsSceneCapability({
                verification: 'heuristic',
                availability: 'heuristic',
                targetUrlPlaceholder: '填写 Temu 店铺页或活动页链接',
                overview: '店铺热门商品场景以页面卡片列表为主。',
                examples: [
                    {
                        title: 'Temu 店铺热门商品采集',
                        payload: {
                            platform: 'temu',
                            collectScene: 'shop_hot_products',
                            configData: {
                                targetUrl: 'https://www.temu.com/store.html?store_id=1000000000',
                                maxItems: 60,
                            },
                        },
                    },
                ],
            }),
        ],
    }),
};

export default temuPlatform;
