import { DEFAULT_SUPPORTED_SCENES } from '../shared.js';
import {
    sheinHotProductsScene,
    sheinProductDetailScene,
    sheinSearchScene,
} from './selectors.js';

const sheinPlatform = {
    platform: 'shein',
    label: 'SHEIN',
    supportedScenes: DEFAULT_SUPPORTED_SCENES,
    search: sheinSearchScene,
    productDetail: sheinProductDetailScene,
    shopHotProducts: sheinHotProductsScene,
    verification: {
        search: 'heuristic',
        product_detail: 'heuristic',
        shop_hot_products: 'heuristic',
    },
    hooks: {
        async normalizeRecord({ record, collectScene, page }) {
            if (!['search', 'shop_hot_products'].includes(collectScene)) {
                return record;
            }

            const resolved = await page.evaluate(({ sourceUrl, currentTitle }) => {
                const anchors = Array.from(document.querySelectorAll('a[href*="-p-"]'));
                const target = anchors.find((node) => {
                    const href = node.getAttribute('href') || '';
                    const absoluteHref = node.href || '';
                    return href === sourceUrl || absoluteHref === sourceUrl || absoluteHref.startsWith(sourceUrl);
                }) || anchors.find((node) => {
                    const aria = (node.getAttribute('aria-label') || '').trim();
                    return aria && aria === currentTitle;
                });

                if (!target) {
                    return null;
                }

                const currentPrice = (target.getAttribute('data-price') || '').trim();
                const originalPrice = (target.getAttribute('data-us-origin-price') || '').trim();
                const title =
                    (target.getAttribute('data-title') || '').trim() ||
                    (target.getAttribute('aria-label') || '').trim();

                return {
                    title,
                    priceText: currentPrice ? `$${currentPrice}` : '',
                    badgeText: originalPrice ? `Original $${originalPrice}` : '',
                    recordKey:
                        (target.getAttribute('data-id') || '').trim() ||
                        (target.getAttribute('data-sku') || '').trim() ||
                        '',
                };
            }, {
                sourceUrl: record.sourceUrl,
                currentTitle: record.title,
            }).catch(() => null);

            if (!resolved) {
                return record;
            }

            return {
                ...record,
                title: resolved.title || record.title,
                priceText: resolved.priceText || record.priceText,
                badgeText: resolved.badgeText || record.badgeText,
                recordKey: resolved.recordKey || record.recordKey,
            };
        },
    },
};

export default sheinPlatform;
