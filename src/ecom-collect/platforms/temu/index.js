import { DEFAULT_SUPPORTED_SCENES } from '../shared.js';
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
};

export default temuPlatform;
