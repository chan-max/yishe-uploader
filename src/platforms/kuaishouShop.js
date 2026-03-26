import { BasicShopPublisher } from './basicShopPublisher.js';

const DEFAULT_CREATE_URL = 'https://s.kwaixiaodian.com/zone/goods/nexus/self/release/add';

function resolveCreateUrl(sameId) {
    const normalizedSameId = String(sameId || '').trim();
    return normalizedSameId
        ? `${DEFAULT_CREATE_URL}?sameId=${encodeURIComponent(normalizedSameId)}`
        : DEFAULT_CREATE_URL;
}

class KuaishouShopPublisher extends BasicShopPublisher {
    constructor() {
        super({
            platformKey: 'kuaishou_shop',
            platformName: '快手小店',
            uploadUrl: DEFAULT_CREATE_URL,
            enablePrice: false,
            enableProductCode: true,
            keepPageOpen: true,
            resolveUploadUrl: ({ settings = {}, publishInfo = {}, defaultUrl }) => {
                const sameId = String(settings.sameId || publishInfo.sameId || '').trim();
                return sameId ? resolveCreateUrl(sameId) : defaultUrl;
            },
            selectors: {
                titleInput: [
                    'input[placeholder*="商品标题"]',
                    'input[placeholder*="标题"]',
                    'input[placeholder*="商品名称"]',
                    'input[name*="title"]'
                ],
                contentInput: [
                    'textarea[placeholder*="商品描述"]',
                    'textarea[placeholder*="描述"]',
                    'textarea',
                    '[contenteditable="true"]'
                ],
                productCodeInput: [
                    'td.attr-column-field_code input[type="text"]',
                    'input[placeholder*="商家编码"]',
                    'input[placeholder*="商品编码"]',
                    'input[placeholder*="编码"]',
                    'input[name*="productCode"]',
                    'input[name*="field_code"]'
                ],
                fileInput: 'input[type="file"]',
                submitButton: [
                    'button:has-text("发布商品")',
                    'button:has-text("提交审核")',
                    'button:has-text("发布")'
                ],
                userElements: ['.user-info', '.account-info', '.avatar', '.header-user', '[class*="merchant"]'],
                loginElements: ['.login-btn', '.login-button', '.auth-btn', 'text=登录', 'text=扫码登录']
            }
        });
    }
}

export const kuaishouShopPublisher = new KuaishouShopPublisher();

export async function publishToKuaishouShop(publishInfo) {
    return await kuaishouShopPublisher.publish(publishInfo);
}

export default kuaishouShopPublisher;
