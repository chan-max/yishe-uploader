export const DEFAULT_SUPPORTED_SCENES = ['search', 'product_detail', 'shop_hot_products'];

export const ECOM_CAPABILITY_STATUS_META = {
    available: {
        label: '可用',
        runnable: true,
    },
    partial: {
        label: '部分可用',
        runnable: true,
    },
    heuristic: {
        label: '启发式可用',
        runnable: true,
    },
    blocked: {
        label: '受限',
        runnable: false,
    },
    unsupported: {
        label: '未实现',
        runnable: false,
    },
};

export const ECOM_VERIFICATION_STATUS_META = {
    verified: '已验证',
    heuristic: '启发式',
    blocked: '受限',
    planned: '待验证',
    unsupported: '未实现',
};

const SCENE_MAP = {
    search: {
        value: 'search',
        label: '关键词搜索',
        description: '根据关键词进入平台前台搜索页，提取商品卡片原始数据。',
    },
    product_detail: {
        value: 'product_detail',
        label: '商品详情',
        description: '打开指定商品详情页，抓取详情原始信息与页面快照。',
    },
    shop_hot_products: {
        value: 'shop_hot_products',
        label: '店铺热门商品',
        description: '打开店铺或榜单类页面，提取热门商品卡片原始数据。',
    },
};

function cloneValue(input) {
    if (input === undefined) {
        return undefined;
    }
    return JSON.parse(JSON.stringify(input));
}

function mergeArray(input = [], fallback = []) {
    const source = Array.isArray(input) ? input : fallback;
    return source
        .map((item) => {
            if (item === undefined || item === null) {
                return '';
            }
            return typeof item === 'string' ? item.trim() : item;
        })
        .filter(Boolean);
}

export function createField(key, label, overrides = {}) {
    return {
        key,
        label,
        component: 'input',
        valueType: 'string',
        required: false,
        placeholder: '',
        description: '',
        defaultValue: undefined,
        rows: undefined,
        min: undefined,
        max: undefined,
        step: undefined,
        options: undefined,
        examples: undefined,
        ...cloneValue(overrides),
    };
}

export function buildKeywordField(overrides = {}) {
    return createField('keyword', '关键词', {
        placeholder: '例如：wireless earbuds',
        description: '单个主关键词，便于快速试跑。',
        examples: ['wireless earbuds'],
        ...overrides,
    });
}

export function buildKeywordsField(overrides = {}) {
    return createField('keywords', '关键词列表', {
        component: 'array-text',
        valueType: 'string[]',
        placeholder: '一行一个关键词，也支持逗号分隔',
        description: '多关键词批量执行时使用；会自动去重并去空。',
        rows: 4,
        ...overrides,
    });
}

export function buildTargetUrlField(overrides = {}) {
    return createField('targetUrl', '目标链接', {
        component: 'url',
        valueType: 'url',
        placeholder: 'https://example.com/item/123',
        description: '填写商品详情页、店铺页或榜单页链接。',
        required: true,
        ...overrides,
    });
}

export function buildMaxPagesField(overrides = {}) {
    return createField('maxPages', '最大页数', {
        component: 'input-number',
        valueType: 'integer',
        description: '搜索场景最多翻页数，建议小批量逐步验证。',
        defaultValue: 2,
        min: 1,
        max: 20,
        step: 1,
        ...overrides,
    });
}

export function buildMaxItemsField(overrides = {}) {
    return createField('maxItems', '最大记录数', {
        component: 'input-number',
        valueType: 'integer',
        description: '单次任务最多保存的记录条数。',
        defaultValue: 60,
        min: 1,
        max: 500,
        step: 1,
        ...overrides,
    });
}

export function buildSelectField(key, label, overrides = {}) {
    return createField(key, label, {
        component: 'select',
        valueType: 'string',
        options: [],
        ...overrides,
    });
}

export function buildJsonField(key, label, overrides = {}) {
    return createField(key, label, {
        component: 'json',
        valueType: 'json',
        rows: 6,
        ...overrides,
    });
}

export function buildSwitchField(key, label, overrides = {}) {
    return createField(key, label, {
        component: 'switch',
        valueType: 'boolean',
        ...overrides,
    });
}

function normalizeExamplePayloads(examples = [], sceneValue = '') {
    return mergeArray(examples).map((item, index) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            return {
                title: item.title || `${sceneValue || 'scene'} 示例 ${index + 1}`,
                description: item.description || '',
                payload: cloneValue(item.payload || item.task || item.request || {}),
            };
        }

        return {
            title: `${sceneValue || 'scene'} 示例 ${index + 1}`,
            description: '',
            payload: cloneValue(item),
        };
    });
}

export function buildSceneCapability(baseScene, overrides = {}) {
    const status = String(overrides.availability || 'heuristic').trim() || 'heuristic';
    const statusMeta = ECOM_CAPABILITY_STATUS_META[status] || ECOM_CAPABILITY_STATUS_META.heuristic;
    const fields = Array.isArray(overrides.fields) ? overrides.fields.map((item) => cloneValue(item)) : [];

    return {
        value: baseScene.value,
        label: baseScene.label,
        description: overrides.description || baseScene.description || '',
        availability: status,
        availabilityLabel: statusMeta.label,
        runnable:
            overrides.runnable !== undefined
                ? !!overrides.runnable
                : statusMeta.runnable,
        verification: String(overrides.verification || 'planned').trim() || 'planned',
        verificationLabel:
            ECOM_VERIFICATION_STATUS_META[String(overrides.verification || 'planned').trim()] ||
            ECOM_VERIFICATION_STATUS_META.planned,
        reason: String(overrides.reason || '').trim() || null,
        fields,
        docs: {
            overview: String(overrides.overview || '').trim() || '',
            notes: mergeArray(overrides.notes),
            examples: normalizeExamplePayloads(overrides.examples, baseScene.value),
        },
    };
}

export function buildPlatformCapability(overrides = {}) {
    const scenes = Array.isArray(overrides.scenes) ? overrides.scenes.map((item) => cloneValue(item)) : [];
    const status = String(overrides.status || 'heuristic').trim() || 'heuristic';
    const statusMeta = ECOM_CAPABILITY_STATUS_META[status] || ECOM_CAPABILITY_STATUS_META.heuristic;

    return {
        regions: mergeArray(overrides.regions, ['global']),
        status,
        statusLabel: statusMeta.label,
        runnable:
            overrides.runnable !== undefined
                ? !!overrides.runnable
                : scenes.some((item) => item?.runnable !== false),
        reason: String(overrides.reason || '').trim() || null,
        docs: {
            overview: String(overrides.overview || '').trim() || '',
            notes: mergeArray(overrides.notes),
        },
        maintenance: {
            moduleDir: String(overrides.moduleDir || '').trim() || '',
            selectorFile: String(overrides.selectorFile || '').trim() || '',
            readmeFile: String(overrides.readmeFile || '').trim() || '',
            notes: mergeArray(overrides.maintenanceNotes),
        },
        scenes,
    };
}

export function buildSearchSceneCapability(overrides = {}) {
    return buildSceneCapability(SCENE_MAP.search, {
        fields: [
            buildKeywordField({
                required: true,
                placeholder: overrides.keywordPlaceholder || '例如：wireless earbuds',
            }),
            buildKeywordsField({
                placeholder: overrides.keywordsPlaceholder || '一行一个关键词，也支持逗号分隔',
            }),
            buildMaxPagesField({
                defaultValue:
                    overrides.defaultMaxPages !== undefined
                        ? overrides.defaultMaxPages
                        : 2,
            }),
            buildMaxItemsField({
                defaultValue:
                    overrides.defaultMaxItems !== undefined
                        ? overrides.defaultMaxItems
                        : 60,
            }),
            ...(Array.isArray(overrides.extraFields) ? overrides.extraFields : []),
        ],
        ...overrides,
    });
}

export function buildProductDetailSceneCapability(overrides = {}) {
    return buildSceneCapability(SCENE_MAP.product_detail, {
        fields: [
            buildTargetUrlField({
                placeholder: overrides.targetUrlPlaceholder || '填写商品详情页链接',
            }),
            ...(Array.isArray(overrides.extraFields) ? overrides.extraFields : []),
        ],
        ...overrides,
    });
}

export function buildShopHotProductsSceneCapability(overrides = {}) {
    return buildSceneCapability(SCENE_MAP.shop_hot_products, {
        fields: [
            buildTargetUrlField({
                placeholder: overrides.targetUrlPlaceholder || '填写店铺页或榜单页链接',
            }),
            buildMaxItemsField({
                defaultValue:
                    overrides.defaultMaxItems !== undefined
                        ? overrides.defaultMaxItems
                        : 60,
            }),
            ...(Array.isArray(overrides.extraFields) ? overrides.extraFields : []),
        ],
        ...overrides,
    });
}

export const SHARED_LIST_ITEM_ANCESTORS = [
    'article',
    'li',
    '[data-index]',
    '[data-testid*="product"]',
    '[class*="product"]',
    '[class*="item"]',
    '[class*="card"]',
    '[class*="tile"]',
    '[class*="grid"] > div',
    'div',
];
