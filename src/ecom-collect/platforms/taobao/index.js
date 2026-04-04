import { DEFAULT_SUPPORTED_SCENES } from '../shared.js';
import {
    taobaoHotProductsScene,
    taobaoProductDetailScene,
    taobaoSearchScene,
} from './selectors.js';

const taobaoPlatform = {
    platform: 'taobao',
    label: '淘宝',
    supportedScenes: DEFAULT_SUPPORTED_SCENES,
    search: taobaoSearchScene,
    productDetail: taobaoProductDetailScene,
    shopHotProducts: taobaoHotProductsScene,
    verification: {
        search: 'heuristic',
        product_detail: 'heuristic',
        shop_hot_products: 'heuristic',
    },
};

export default taobaoPlatform;
