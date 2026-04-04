import { DEFAULT_SUPPORTED_SCENES } from '../shared.js';
import {
    jdHotProductsScene,
    jdProductDetailScene,
    jdSearchScene,
} from './selectors.js';

const jdPlatform = {
    platform: 'jd',
    label: '京东',
    supportedScenes: DEFAULT_SUPPORTED_SCENES,
    search: jdSearchScene,
    productDetail: jdProductDetailScene,
    shopHotProducts: jdHotProductsScene,
    verification: {
        search: 'heuristic',
        product_detail: 'heuristic',
        shop_hot_products: 'heuristic',
    },
    hooks: {
        normalizeRecord({ record, collectScene, pageUrl }) {
            if (collectScene !== 'shop_hot_products' || record.sourceUrl) {
                return record;
            }

            return {
                ...record,
                sourceUrl: pageUrl,
                recordKey: record.recordKey || `${pageUrl}#${record.title || 'item'}`,
            };
        },
    },
};

export default jdPlatform;
