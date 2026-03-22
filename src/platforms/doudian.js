import { BasicShopPublisher } from './basicShopPublisher.js';

class DoudianPublisher extends BasicShopPublisher {
    constructor() {
        super({
            platformKey: 'doudian',
            platformName: '抖店',
            uploadUrl: 'https://fxg.jinritemai.com/ffa/g/create',
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
                fileInput: 'input[type="file"]',
                priceInput: [
                    'input[placeholder*="价格"]',
                    'input[placeholder*="售价"]',
                    'input[name*="price"]'
                ],
                draftButton: [
                    'button:has-text("保存草稿")',
                    'button:has-text("暂存")',
                    'button:has-text("保存")'
                ],
                submitButton: [
                    'button:has-text("发布商品")',
                    'button:has-text("提交审核")',
                    'button:has-text("发布")'
                ],
                userElements: ['.header-user-info', '.account-info', '.user-info', '.avatar', '[class*="merchant"]'],
                loginElements: ['.login-btn', '.login-button', '.auth-btn', 'text=登录', 'text=扫码登录']
            }
        });
    }
}

export const doudianPublisher = new DoudianPublisher();

export async function publishToDoudian(publishInfo) {
    return await doudianPublisher.publish(publishInfo);
}

export default doudianPublisher;
