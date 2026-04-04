import { DEFAULT_SUPPORTED_SCENES } from '../shared.js';
import {
    aliexpressProductDetailScene,
    aliexpressSearchScene,
    aliexpressShopHotProductsScene,
} from './selectors.js';

function normalizeAliExpressPrice(value) {
    const compactText = String(value || '').replace(/\s+/g, '');
    const matched = compactText.match(/([A-Za-z$€£¥￥]{1,5})(\d+(?:\.\d+)?)/);
    if (!matched) {
        return String(value || '').trim();
    }
    return `${matched[1]} ${matched[2]}`;
}

const aliexpressPlatform = {
    platform: 'aliexpress',
    label: 'AliExpress',
    supportedScenes: DEFAULT_SUPPORTED_SCENES,
    search: aliexpressSearchScene,
    productDetail: aliexpressProductDetailScene,
    shopHotProducts: aliexpressShopHotProductsScene,
    verification: {
        search: 'verified',
        product_detail: 'heuristic',
        shop_hot_products: 'heuristic',
    },
    hooks: {
        normalizeRecord({ record, collectScene }) {
            if (collectScene !== 'search') {
                return record;
            }

            return {
                ...record,
                priceText: normalizeAliExpressPrice(record.priceText),
            };
        },
    },
};

export default aliexpressPlatform;
