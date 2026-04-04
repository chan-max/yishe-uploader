import { DEFAULT_SUPPORTED_SCENES } from '../shared.js';
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
};

export default amazonPlatform;
