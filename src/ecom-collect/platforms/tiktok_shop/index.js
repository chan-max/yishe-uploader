import { DEFAULT_SUPPORTED_SCENES } from '../shared.js';
import {
    tiktokShopHotProductsScene,
    tiktokShopProductDetailScene,
    tiktokShopSearchScene,
} from './selectors.js';

const tiktokShopPlatform = {
    platform: 'tiktok_shop',
    label: 'TikTok Shop',
    supportedScenes: DEFAULT_SUPPORTED_SCENES,
    search: tiktokShopSearchScene,
    productDetail: tiktokShopProductDetailScene,
    shopHotProducts: tiktokShopHotProductsScene,
    verification: {
        search: 'heuristic',
        product_detail: 'heuristic',
        shop_hot_products: 'heuristic',
    },
};

export default tiktokShopPlatform;
