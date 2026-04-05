import {
    buildPlatformCapability,
    buildProductDetailSceneCapability,
    buildSearchSceneCapability,
    buildShopHotProductsSceneCapability,
    DEFAULT_SUPPORTED_SCENES,
} from '../shared.js';
import {
    amazonProductDetailScene,
    amazonSearchScene,
    amazonShopHotProductsScene,
} from './selectors.js';

const amazonPlatform = {
    platform: 'amazon',
    label: 'Amazon',
    supportedScenes: DEFAULT_SUPPORTED_SCENES,
    search: amazonSearchScene,
    productDetail: amazonProductDetailScene,
    shopHotProducts: amazonShopHotProductsScene,
    verification: {
        search: 'verified',
        product_detail: 'verified',
        shop_hot_products: 'verified',
    },
    capability: buildPlatformCapability({
        regions: ['global'],
        status: 'available',
        overview:
            'Amazon 当前是首批优先平台，搜索、详情、店铺热门商品三类场景都已做过真实 DOM 调试。',
        notes: [
            '适合先作为稳定平台上线，后续再逐步扩更多跨境站点。',
            '当前以原始数据保真入库为主，不强行在采集时做深度结构化。',
        ],
        moduleDir: 'src/ecom-collect/platforms/amazon',
        selectorFile: 'src/ecom-collect/platforms/amazon/selectors.js',
        readmeFile: 'src/ecom-collect/platforms/amazon/README.md',
        maintenanceNotes: [
            '页面结构改动时，优先修复 selectors.js 中的卡片根节点与字段候选选择器。',
            '如果命中地区跳转，可在平台 hook 中单独补交互，不要把特例塞进通用流程。',
        ],
        scenes: [
            buildSearchSceneCapability({
                verification: 'verified',
                availability: 'available',
                keywordPlaceholder: '例如：wireless earbuds',
                keywordsPlaceholder: '一行一个关键词，可按细分类目拆分',
                overview: '进入 Amazon 搜索页后抓取商品卡片原始数据。',
                notes: [
                    '推荐先从搜索场景验证平台是否可用。',
                    '支持 keyword 与 keywords 两种入参，keywords 适合批量跑词。',
                ],
                examples: [
                    {
                        title: 'Amazon 搜索采集',
                        description: '按关键词抓取搜索结果卡片。',
                        payload: {
                            platform: 'amazon',
                            collectScene: 'search',
                            configData: {
                                keyword: 'wireless earbuds',
                                keywords: ['wireless earbuds', 'bluetooth headphones'],
                                maxPages: 2,
                                maxItems: 60,
                            },
                        },
                    },
                ],
            }),
            buildProductDetailSceneCapability({
                verification: 'verified',
                availability: 'available',
                targetUrlPlaceholder: '填写 Amazon 商品详情页链接',
                overview: '打开商品详情页，尽量保真地提取标题、主图、描述等详情原始数据。',
                notes: ['如果跳国家站点，优先补详情页 URL 规范化和地区选择逻辑。'],
                examples: [
                    {
                        title: 'Amazon 商品详情采集',
                        payload: {
                            platform: 'amazon',
                            collectScene: 'product_detail',
                            configData: {
                                targetUrl: 'https://www.amazon.com/dp/B0C1234567',
                            },
                        },
                    },
                ],
            }),
            buildShopHotProductsSceneCapability({
                verification: 'verified',
                availability: 'available',
                targetUrlPlaceholder: '填写 Amazon 店铺页、Best Sellers 或榜单页链接',
                overview: '打开店铺热门商品页或榜单页，提取卡片原始数据。',
                notes: ['店铺热门商品场景更依赖目标页链接的稳定性。'],
                examples: [
                    {
                        title: 'Amazon 店铺热门商品采集',
                        payload: {
                            platform: 'amazon',
                            collectScene: 'shop_hot_products',
                            configData: {
                                targetUrl: 'https://www.amazon.com/best-sellers-electronics/zgbs',
                                maxItems: 60,
                            },
                        },
                    },
                ],
            }),
        ],
    }),
};

export default amazonPlatform;
