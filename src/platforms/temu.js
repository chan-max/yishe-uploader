import { getOrCreateBrowser } from '../services/BrowserService.js';
import { PageOperator } from '../services/PageOperator.js';
import { logger } from '../utils/logger.js';

const PLATFORM_KEY = 'temu';
const PLATFORM_NAME = 'Temu';
const TEMU_CREATE_URL = 'https://agentseller.temu.com/goods/create/category';
const TEMU_EDIT_URL_KEYWORD = '/goods/edit';
const TEMU_CATEGORY_URL_KEYWORD = '/goods/create/category';
const TEMU_LOGIN_URL_KEYWORDS = ['login', 'passport', 'auth'];

function normalizeBoolean(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeTemuSettings(publishInfo = {}) {
    const settings = publishInfo.platformOptions || publishInfo.publishOptions || publishInfo.platformSettings?.[PLATFORM_KEY] || {};
    return {
        account: String(settings.account || publishInfo.account || '').trim(),
        password: String(settings.password || publishInfo.password || '').trim(),
        needLogin: normalizeBoolean(settings.needLogin ?? publishInfo.needLogin),
        keepPageOpen: normalizeBoolean(settings.keepPageOpen ?? publishInfo.keepPageOpen),
        createUrl: String(settings.createUrl || publishInfo.createUrl || TEMU_CREATE_URL).trim() || TEMU_CREATE_URL
    };
}

async function checkTemuLogin(page) {
    const currentUrl = String(page.url() || '');
    if (TEMU_LOGIN_URL_KEYWORDS.some((keyword) => currentUrl.includes(keyword))) {
        return false;
    }

    const loggedInSelectors = [
        '[class*="account-info_accountInfo"]',
        '[class*="account-info_mallInfo"]',
        '[class*="account-info_userInfo"]'
    ];

    for (const selector of loggedInSelectors) {
        try {
            if (await page.locator(selector).first().count()) {
                return true;
            }
        } catch {
            // ignore
        }
    }

    const loginSignals = [
        'input[type="password"]',
        'input[autocomplete="current-password"]',
        'form input[name="password"]'
    ];

    for (const selector of loginSignals) {
        try {
            if (await page.locator(selector).first().count()) {
                return false;
            }
        } catch {
            // ignore
        }
    }

    const bodyText = await page.evaluate(() => String(document.body?.innerText || '').replace(/\s+/g, ' ').trim()).catch(() => '');
    if (/登录|sign in|log in/i.test(bodyText)) {
        return false;
    }

    return currentUrl.includes('agentseller.temu.com');
}

function resolveTemuFrameworkStage(pageUrl) {
    const currentUrl = String(pageUrl || '');
    if (currentUrl.includes(TEMU_EDIT_URL_KEYWORD)) {
        return 'edit_page_ready';
    }
    if (currentUrl.includes(TEMU_CATEGORY_URL_KEYWORD)) {
        return 'category_selection_pending';
    }
    return 'page_opened';
}

async function collectTemuFrameworkSnapshot(page) {
    return await page.evaluate(() => {
        const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const isVisible = (element) => {
            if (!(element instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && rect.width > 0
                && rect.height > 0;
        };

        const buttons = Array.from(document.querySelectorAll('button,[role="button"]'))
            .filter(isVisible)
            .map((element) => normalize(element.textContent))
            .filter(Boolean)
            .slice(0, 12);

        const inputs = Array.from(document.querySelectorAll('input,textarea'))
            .filter(isVisible)
            .map((element) => ({
                placeholder: element.getAttribute('placeholder') || '',
                type: element.getAttribute('type') || element.tagName.toLowerCase()
            }))
            .slice(0, 20);

        return {
            title: document.title,
            bodyPreview: normalize(document.body?.innerText || '').slice(0, 1200),
            buttons,
            inputs
        };
    }).catch(() => ({
        title: '',
        bodyPreview: '',
        buttons: [],
        inputs: []
    }));
}

export async function publishToTemu(publishInfo = {}) {
    const pageOperator = new PageOperator();
    const settings = normalizeTemuSettings(publishInfo);
    let page = null;

    try {
        logger.info(`${PLATFORM_NAME}发布骨架启动`, {
            createUrl: settings.createUrl,
            needLogin: settings.needLogin,
            hasAccount: !!settings.account,
            hasPassword: !!settings.password,
            keepPageOpen: settings.keepPageOpen
        });

        const browser = await getOrCreateBrowser({ profileId: publishInfo?.profileId });
        page = await browser.newPage();
        await pageOperator.setupAntiDetection(page);

        logger.info(`${PLATFORM_NAME}准备打开商品创建页: ${settings.createUrl}`);
        await page.goto(settings.createUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await page.waitForTimeout(4000);

        const loggedIn = await checkTemuLogin(page);
        logger.info(`${PLATFORM_NAME}登录检测结果: ${loggedIn ? '已登录' : '未登录'}`, {
            currentUrl: page.url()
        });

        if (!loggedIn) {
            if (settings.needLogin) {
                return {
                    success: false,
                    message: `${PLATFORM_NAME}自动登录流程待补充，请先手动登录后再执行当前骨架流程`,
                    data: {
                        frameworkReady: false,
                        loginRequired: true,
                        autoLoginPlanned: true,
                        currentUrl: page.url(),
                        pageKeptOpen: settings.keepPageOpen
                    }
                };
            }

            return {
                success: false,
                message: `请先登录${PLATFORM_NAME}商家后台`,
                data: {
                    frameworkReady: false,
                    loginRequired: true,
                    autoLoginPlanned: false,
                    currentUrl: page.url(),
                    pageKeptOpen: settings.keepPageOpen
                }
            };
        }

        const snapshot = await collectTemuFrameworkSnapshot(page);
        const frameworkStage = resolveTemuFrameworkStage(page.url());

        logger.info(`${PLATFORM_NAME}发布骨架已就绪`, {
            currentUrl: page.url(),
            frameworkStage,
            pageTitle: snapshot.title,
            buttons: snapshot.buttons,
            inputCount: snapshot.inputs.length
        });

        return {
            success: true,
            message: `${PLATFORM_NAME}发布骨架已打通，当前已到 ${frameworkStage === 'edit_page_ready' ? '商品编辑页' : '类目选择页'}`,
            data: {
                frameworkReady: true,
                frameworkStage,
                currentUrl: page.url(),
                pageTitle: snapshot.title,
                detectedButtons: snapshot.buttons,
                detectedInputs: snapshot.inputs,
                pendingCapabilities: [
                    'publish_info_preparation',
                    'publish_data_mapping',
                    'final_publish_submission'
                ],
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } catch (error) {
        logger.error(`${PLATFORM_NAME}发布骨架执行失败:`, error);
        return {
            success: false,
            message: error?.message || `${PLATFORM_NAME}发布骨架执行失败`,
            data: {
                frameworkReady: false,
                currentUrl: page?.url?.() || '',
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } finally {
        if (page && !settings.keepPageOpen) {
            try {
                await page.close();
            } catch (closeError) {
                logger.warn(`${PLATFORM_NAME}关闭页面失败: ${closeError?.message || closeError}`);
            }
        } else if (page && settings.keepPageOpen) {
            logger.info(`${PLATFORM_NAME}调试模式：保留页面，不自动关闭 tab`);
        }
    }
}

export const temuPublisher = { publish: publishToTemu };

export default temuPublisher;
