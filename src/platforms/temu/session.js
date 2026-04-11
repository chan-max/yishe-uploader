import {
    PLATFORM_NAME,
    TEMU_SELLER_HOME_URL,
    TEMU_USERINFO_API_URL
} from './constants.js';
import {
    clickClickableByText
} from './page.js';
import {
    logger
} from '../../utils/logger.js';

const TEMU_DEFAULT_ACCEPT = 'application/json, text/plain, */*';
const TEMU_REGION_URLS = {
    global: TEMU_SELLER_HOME_URL,
    us: 'https://agentseller-us.temu.com/',
    eu: 'https://agentseller-eu.temu.com/'
};
const TEMU_REGION_HOSTS = {
    global: 'agentseller.temu.com',
    us: 'agentseller-us.temu.com',
    eu: 'agentseller-eu.temu.com'
};
const TEMU_REGION_CLICK_LABELS = {
    us: ['United States', 'US', 'United States Site', '美国', '美区'],
    eu: ['Europe', 'EU', 'European Site', '欧洲', '欧区']
};
const TEMU_REGION_CLICK_INDEX = {
    us: 1,
    eu: 2
};
const TEMU_REGION_CARD_SELECTOR = 'a.index-module__drItem___kEdZY';
const TEMU_REQUEST_CAPTURE_SELECTOR = 'a,button,[role="button"],span,div,label,p';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCookieEntries(cookieEntries = [], domainKeyword = '') {
    const result = {};
    const safeDomainKeyword = String(domainKeyword || '').trim();

    for (const cookie of cookieEntries) {
        if (!cookie?.name) {
            continue;
        }

        const cookieDomain = String(cookie.domain || '');
        if (safeDomainKeyword && !cookieDomain.includes(safeDomainKeyword)) {
            continue;
        }

        result[cookie.name] = cookie.value;
    }

    return result;
}

function buildCookieHeader(cookies = {}) {
    return Object.entries(cookies)
        .filter(([name, value]) => String(name || '').trim() && value !== undefined && value !== null)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
}

function getFallbackOriginFromUrl(pageUrl) {
    try {
        const url = new URL(String(pageUrl || '').trim() || TEMU_SELLER_HOME_URL);
        return url.origin;
    } catch {
        return new URL(TEMU_SELLER_HOME_URL).origin;
    }
}

function buildRegionHeaders(regionKey, sessionInfo = {}) {
    const regionUrl = TEMU_REGION_URLS[regionKey] || TEMU_REGION_URLS.global;
    const origin = new URL(regionUrl).origin;
    const headers = {
        accept: TEMU_DEFAULT_ACCEPT,
        'content-type': 'application/json',
        origin,
        referer: regionUrl,
        'user-agent': String(sessionInfo.userAgent || '').trim()
    };

    if (sessionInfo.antiContent) {
        headers['anti-content'] = sessionInfo.antiContent;
    }
    if (sessionInfo.mallId) {
        headers.mallid = String(sessionInfo.mallId);
    }

    return headers;
}

function pickSelectedMall(mallList = [], preferredMallId = '') {
    const safeMallId = String(preferredMallId || '').trim();
    if (!Array.isArray(mallList) || !mallList.length) {
        return null;
    }

    if (safeMallId) {
        const matchedMall = mallList.find((item) => String(item?.mallId || '') === safeMallId);
        if (matchedMall) {
            return matchedMall;
        }
    }

    return mallList[0] || null;
}

function summarizeCookieDomains(cookieEntries = []) {
    const domains = Array.from(new Set(
        cookieEntries
            .map((item) => String(item?.domain || '').trim())
            .filter(Boolean)
    ));

    return domains.sort();
}

function createTemuRequestCapture(context) {
    const state = {
        requestCount: 0,
        antiContent: '',
        mallId: '',
        origin: '',
        referer: '',
        userAgent: '',
        lastRequestUrl: '',
        requestSamples: []
    };

    const onRequest = (request) => {
        try {
            const url = String(request.url() || '');
            const resourceType = String(request.resourceType() || '');
            if (!/temu\.com|kuajingmaihuo\.com/i.test(url)) {
                return;
            }
            if (!['xhr', 'fetch', 'document'].includes(resourceType)) {
                return;
            }

            const headers = request.headers();
            const normalizedHeaders = Object.fromEntries(
                Object.entries(headers || {}).map(([key, value]) => [String(key || '').toLowerCase(), String(value || '').trim()])
            );

            state.requestCount += 1;
            state.lastRequestUrl = url;

            if (normalizedHeaders['anti-content']) {
                state.antiContent = normalizedHeaders['anti-content'];
            }
            if (normalizedHeaders.mallid && normalizedHeaders.mallid !== 'undefined') {
                state.mallId = normalizedHeaders.mallid;
            }
            if (normalizedHeaders.origin) {
                state.origin = normalizedHeaders.origin;
            }
            if (normalizedHeaders.referer) {
                state.referer = normalizedHeaders.referer;
            }
            if (normalizedHeaders['user-agent']) {
                state.userAgent = normalizedHeaders['user-agent'];
            }

            if (state.requestSamples.length < 8) {
                state.requestSamples.push({
                    url,
                    resourceType,
                    hasAntiContent: !!normalizedHeaders['anti-content'],
                    mallId: normalizedHeaders.mallid || '',
                    origin: normalizedHeaders.origin || '',
                    referer: normalizedHeaders.referer || ''
                });
            }
        } catch {
            // ignore request capture failures
        }
    };

    context.on('request', onRequest);

    return {
        state,
        dispose() {
            context.off('request', onRequest);
        }
    };
}

async function waitForCaptureWarmup(captureState, timeoutMs = 8_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (captureState.requestCount > 0 && (captureState.antiContent || captureState.origin || captureState.referer)) {
            return true;
        }
        await sleep(400);
    }
    return captureState.requestCount > 0;
}

async function postJsonWithTimeout(url, options = {}, timeoutMs = 15_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`request timeout after ${timeoutMs}ms`)), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchTemuUserInfo(headersTemplate = {}, cookies = {}) {
    const cookieHeader = buildCookieHeader(cookies);
    if (!cookieHeader) {
        return {
            success: false,
            message: 'cookies 为空，无法请求 userInfo'
        };
    }

    const baseHeaders = {
        accept: headersTemplate.accept || TEMU_DEFAULT_ACCEPT,
        'content-type': headersTemplate['content-type'] || 'application/json',
        origin: headersTemplate.origin || new URL(TEMU_SELLER_HOME_URL).origin,
        referer: headersTemplate.referer || TEMU_SELLER_HOME_URL,
        cookie: cookieHeader
    };

    if (headersTemplate['user-agent']) {
        baseHeaders['user-agent'] = headersTemplate['user-agent'];
    }

    const attemptHeadersList = [];
    if (headersTemplate['anti-content']) {
        attemptHeadersList.push({
            ...baseHeaders,
            'anti-content': headersTemplate['anti-content']
        });
    }
    attemptHeadersList.push(baseHeaders);

    let lastFailure = null;

    for (const requestHeaders of attemptHeadersList) {
        try {
            const response = await postJsonWithTimeout(TEMU_USERINFO_API_URL, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify({})
            });
            const rawText = await response.text();
            let payload = null;

            try {
                payload = rawText ? JSON.parse(rawText) : null;
            } catch {
                payload = null;
            }

            if (!response.ok) {
                lastFailure = {
                    success: false,
                    status: response.status,
                    message: payload?.errorMsg || rawText || `userInfo 请求失败，状态码 ${response.status}`
                };
                continue;
            }

            const result = payload?.result || {};
            return {
                success: payload?.success === true,
                status: response.status,
                payload,
                accountId: result.accountId || '',
                accountType: result.accountType || '',
                mallList: Array.isArray(result.mallList) ? result.mallList : [],
                message: payload?.success === true ? 'userInfo 获取成功' : payload?.errorMsg || 'userInfo 返回失败'
            };
        } catch (error) {
            lastFailure = {
                success: false,
                message: error?.message || String(error)
            };
        }
    }

    return lastFailure || {
        success: false,
        message: 'userInfo 请求失败'
    };
}

async function attemptRegionSelectionClick(page, regionKey) {
    const labels = TEMU_REGION_CLICK_LABELS[regionKey] || [];
    const clickedByText = await clickClickableByText(page, labels, {
        selector: TEMU_REQUEST_CAPTURE_SELECTOR,
        exact: false
    });
    if (clickedByText) {
        return {
            clicked: true,
            strategy: 'label_click',
            detail: clickedByText.text
        };
    }

    const fallbackIndex = TEMU_REGION_CLICK_INDEX[regionKey];
    if (fallbackIndex === undefined) {
        return {
            clicked: false,
            strategy: 'not_configured'
        };
    }

    try {
        const locator = page.locator(TEMU_REGION_CARD_SELECTOR);
        const count = await locator.count();
        if (count > fallbackIndex) {
            await locator.nth(fallbackIndex).click();
            return {
                clicked: true,
                strategy: 'selector_index',
                detail: `${TEMU_REGION_CARD_SELECTOR}[${fallbackIndex}]`
            };
        }
    } catch {
        // ignore selector fallback errors
    }

    return {
        clicked: false,
        strategy: 'not_found'
    };
}

async function collectRegionCookies(context, regionKey) {
    const regionHost = TEMU_REGION_HOSTS[regionKey];
    const regionUrl = TEMU_REGION_URLS[regionKey];
    let page = null;

    try {
        page = await context.newPage();
        await page.goto(regionUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000
        });
        await page.waitForTimeout(3_000);

        let strategy = 'direct_url';
        let regionCookies = normalizeCookieEntries(await context.cookies(), regionHost);

        if (!Object.keys(regionCookies).length) {
            const clickResult = await attemptRegionSelectionClick(page, regionKey);
            if (clickResult.clicked) {
                strategy = clickResult.strategy;
                await page.waitForTimeout(3_000);
                regionCookies = normalizeCookieEntries(await context.cookies(), regionHost);
            }
        }

        if (!Object.keys(regionCookies).length) {
            const currentUrl = String(page.url() || '');
            if (currentUrl.includes(regionHost)) {
                strategy = `${strategy}+all_context_fallback`;
                regionCookies = normalizeCookieEntries(await context.cookies());
            }
        }

        return {
            success: Object.keys(regionCookies).length > 0,
            region: regionKey,
            currentUrl: page.url(),
            strategy,
            cookieCount: Object.keys(regionCookies).length,
            cookies: regionCookies,
            warning: Object.keys(regionCookies).length > 0 ? '' : `${regionKey} 区域未采集到独立 cookies`
        };
    } catch (error) {
        return {
            success: false,
            region: regionKey,
            currentUrl: page?.url?.() || '',
            strategy: 'error',
            cookieCount: 0,
            cookies: {},
            warning: error?.message || String(error)
        };
    } finally {
        if (page) {
            await page.close().catch(() => { });
        }
    }
}

export async function collectTemuSessionBundle(page, options = {}) {
    const context = page.context();
    const warnings = [];
    const trafficCapture = createTemuRequestCapture(context);

    try {
        logger.info(`${PLATFORM_NAME}准备采集会话信息`, {
            collectRegionCookies: options.collectRegionCookies !== false,
            currentUrl: page.url()
        });

        await page.goto(TEMU_SELLER_HOME_URL, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000
        });
        await page.waitForTimeout(4_000);

        const currentUrl = String(page.url() || '');
        if (/login|passport|authentication/i.test(currentUrl)) {
            return {
                success: false,
                reason: 'login_required',
                message: '当前环境未登录 Temu，无法采集会话'
            };
        }

        const captureReady = await waitForCaptureWarmup(trafficCapture.state, 8_000);
        if (!captureReady) {
            warnings.push('未捕获到明显的 Temu XHR/fetch 请求，anti-content 可能为空');
        }
        if (!trafficCapture.state.antiContent) {
            warnings.push('未捕获到 anti-content，请在后续接入时允许重新刷新页面补抓');
        }

        const allCookies = await context.cookies();
        const cookiesGlobal = normalizeCookieEntries(allCookies);
        if (!Object.keys(cookiesGlobal).length) {
            return {
                success: false,
                reason: 'cookies_not_found',
                message: '未采集到 Temu 会话 cookies'
            };
        }

        const userAgent = trafficCapture.state.userAgent
            || await page.evaluate(() => navigator.userAgent).catch(() => '');
        const origin = trafficCapture.state.origin || getFallbackOriginFromUrl(page.url());
        const referer = trafficCapture.state.referer || `${origin}/`;
        const initialMallId = String(trafficCapture.state.mallId || '').trim();

        const headersTemplate = {
            accept: TEMU_DEFAULT_ACCEPT,
            'content-type': 'application/json',
            origin,
            referer,
            'user-agent': userAgent
        };
        if (trafficCapture.state.antiContent) {
            headersTemplate['anti-content'] = trafficCapture.state.antiContent;
        }
        if (initialMallId) {
            headersTemplate.mallid = initialMallId;
        }

        const userInfoResult = await fetchTemuUserInfo(headersTemplate, cookiesGlobal);
        if (!userInfoResult.success) {
            warnings.push(`mallList 获取失败: ${userInfoResult.message || 'unknown error'}`);
        }

        const mallList = Array.isArray(userInfoResult.mallList) ? userInfoResult.mallList : [];
        const selectedMall = pickSelectedMall(mallList, initialMallId);
        const mallId = String(selectedMall?.mallId || initialMallId || '').trim();
        const mallName = String(selectedMall?.mallName || '').trim();

        if (mallId) {
            headersTemplate.mallid = mallId;
        }

        const regionCollection = {
            enabled: options.collectRegionCookies !== false,
            us: {
                success: false,
                cookieCount: 0,
                cookies: {}
            },
            eu: {
                success: false,
                cookieCount: 0,
                cookies: {}
            }
        };

        if (options.collectRegionCookies !== false) {
            const usRegion = await collectRegionCookies(context, 'us');
            const euRegion = await collectRegionCookies(context, 'eu');
            regionCollection.us = usRegion;
            regionCollection.eu = euRegion;

            if (usRegion.warning) {
                warnings.push(`US 区域: ${usRegion.warning}`);
            }
            if (euRegion.warning) {
                warnings.push(`EU 区域: ${euRegion.warning}`);
            }
        }

        return {
            success: true,
            sessionBundle: {
                collectedAt: new Date().toISOString(),
                currentUrl: page.url(),
                mallId,
                mallName,
                mallList,
                accountId: userInfoResult.accountId || '',
                accountType: userInfoResult.accountType || '',
                antiContent: trafficCapture.state.antiContent || '',
                userAgent,
                headersTemplate,
                regionHeaders: {
                    global: buildRegionHeaders('global', {
                        userAgent,
                        antiContent: trafficCapture.state.antiContent,
                        mallId
                    }),
                    us: buildRegionHeaders('us', {
                        userAgent,
                        antiContent: trafficCapture.state.antiContent,
                        mallId
                    }),
                    eu: buildRegionHeaders('eu', {
                        userAgent,
                        antiContent: trafficCapture.state.antiContent,
                        mallId
                    })
                },
                cookies: cookiesGlobal,
                cookies_global: cookiesGlobal,
                cookies_us: regionCollection.us.cookies || {},
                cookies_eu: regionCollection.eu.cookies || {},
                cookieDomains: summarizeCookieDomains(allCookies),
                requestCapture: {
                    requestCount: trafficCapture.state.requestCount,
                    lastRequestUrl: trafficCapture.state.lastRequestUrl,
                    mallIdFromTraffic: initialMallId,
                    requestSamples: trafficCapture.state.requestSamples
                },
                regionCollection: {
                    enabled: regionCollection.enabled,
                    us: {
                        success: !!regionCollection.us.success,
                        currentUrl: regionCollection.us.currentUrl || '',
                        strategy: regionCollection.us.strategy || '',
                        cookieCount: regionCollection.us.cookieCount || 0
                    },
                    eu: {
                        success: !!regionCollection.eu.success,
                        currentUrl: regionCollection.eu.currentUrl || '',
                        strategy: regionCollection.eu.strategy || '',
                        cookieCount: regionCollection.eu.cookieCount || 0
                    }
                },
                warnings
            }
        };
    } catch (error) {
        logger.error(`${PLATFORM_NAME}采集会话信息失败:`, error);
        return {
            success: false,
            reason: 'session_collect_failed',
            message: error?.message || String(error)
        };
    } finally {
        trafficCapture.dispose();
    }
}

export default {
    collectTemuSessionBundle
};
