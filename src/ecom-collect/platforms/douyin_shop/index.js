import { DEFAULT_SUPPORTED_SCENES } from '../shared.js';
import {
    douyinShopHotProductsScene,
    douyinShopProductDetailScene,
    douyinShopSearchScene,
} from './selectors.js';

const douyinShopPlatform = {
    platform: 'douyin_shop',
    label: '抖音店铺',
    supportedScenes: DEFAULT_SUPPORTED_SCENES,
    search: douyinShopSearchScene,
    productDetail: douyinShopProductDetailScene,
    shopHotProducts: douyinShopHotProductsScene,
    verification: {
        search: 'heuristic',
        product_detail: 'heuristic',
        shop_hot_products: 'heuristic',
    },
};

export default douyinShopPlatform;
