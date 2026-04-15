import { getOrCreateBrowser } from '../../services/BrowserService.js';
import { PageOperator } from '../../services/PageOperator.js';
import { logger } from '../../utils/logger.js';
import { PLATFORM_NAME } from './constants.js';
import {
    normalizeBoolean,
    normalizeTemuSettings,
    pushTrace
} from './utils.js';
import {
    ensureTemuLoginPage,
    performTemuLogin,
    resolveTemuLoginState
} from './login.js';
import {
    clickClickableByText,
    clickVisibleSelector,
    collectTemuEditPageStructure,
    collectTemuFrameworkSnapshot,
    waitForVisibleSelector
} from './page.js';
import {
    collectTemuSessionBundle
} from './session.js';

const TEMU_SESSION_ACQUIRE_MODE_DIRECT = 'direct';
const TEMU_SESSION_ACQUIRE_MODE_LOGIN = 'login';
const TEMU_PUBLISH_DETAIL_TRIGGER_MODE_PAGE_LOAD = 'pageLoad';
const TEMU_PUBLISH_DETAIL_TRIGGER_MODE_MANUAL = 'manual';
const TEMU_PUBLISH_DETAIL_TRIGGER_MODE_BUTTON_TEXT = 'buttonText';
const TEMU_PUBLISH_DETAIL_TRIGGER_MODE_SELECTOR = 'selector';
const TEMU_PUBLISH_DETAIL_PAGE_URL = 'https://agentseller.temu.com/goods/edit?from=productList&productId=';
const TEMU_PUBLISH_DETAIL_REQUEST_URL = 'https://agentseller.temu.com/visage-agent-seller/product/edit';
const TEMU_PUBLISH_DETAIL_TRIGGER_BUTTON_TEXT = '提交';
const TEMU_REQUEST_CAPTURE_CLICK_TIMEOUT = 15_000;
const TEMU_REQUEST_CAPTURE_RESOURCE_TYPES = ['xhr', 'fetch'];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeKeepPageOpen(value) {
    if (value === undefined || value === null || value === '') {
        return true;
    }
    return normalizeBoolean(value);
}

function normalizeCollectRegionCookies(value) {
    if (value === undefined || value === null || value === '') {
        return true;
    }
    return normalizeBoolean(value);
}

function normalizeIncludeDebugInfo(value) {
    if (value === undefined || value === null || value === '') {
        return false;
    }
    return normalizeBoolean(value);
}

function normalizeTemuSessionAcquireMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === TEMU_SESSION_ACQUIRE_MODE_LOGIN) {
        return TEMU_SESSION_ACQUIRE_MODE_LOGIN;
    }
    return TEMU_SESSION_ACQUIRE_MODE_DIRECT;
}

function normalizePositiveInteger(value, fallback, options = {}) {
    const {
        min = 1,
        max = Number.MAX_SAFE_INTEGER
    } = options;
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized <= 0) {
        return fallback;
    }
    return Math.max(min, Math.min(max, Math.floor(normalized)));
}

function normalizeStringList(value) {
    if (Array.isArray(value)) {
        return Array.from(new Set(
            value.map((item) => String(item || '').trim()).filter(Boolean)
        ));
    }

    return Array.from(new Set(
        String(value || '')
            .split(/[\n,，]/)
            .map((item) => String(item || '').trim())
            .filter(Boolean)
    ));
}

function normalizeTemuPublishDetailTriggerMode(value) {
    const normalized = String(value || '').trim();
    if (normalized === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_PAGE_LOAD) {
        return TEMU_PUBLISH_DETAIL_TRIGGER_MODE_PAGE_LOAD;
    }
    if (normalized === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_BUTTON_TEXT) {
        return TEMU_PUBLISH_DETAIL_TRIGGER_MODE_BUTTON_TEXT;
    }
    if (normalized === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_SELECTOR) {
        return TEMU_PUBLISH_DETAIL_TRIGGER_MODE_SELECTOR;
    }
    return TEMU_PUBLISH_DETAIL_TRIGGER_MODE_MANUAL;
}

function buildTemuPublishDetailRequestCaptureSettings(input = {}) {
    const spuId = String(input?.spuId || input?.supId || input?.productId || '').trim();

    return {
        spuId,
        requestKeywords: [TEMU_PUBLISH_DETAIL_REQUEST_URL],
        triggerMode: TEMU_PUBLISH_DETAIL_TRIGGER_MODE_BUTTON_TEXT,
        buttonTexts: [TEMU_PUBLISH_DETAIL_TRIGGER_BUTTON_TEXT],
        buttonSelector: '',
        captureTimeoutMs: normalizePositiveInteger(input?.captureTimeoutMs, 60_000, {
            min: 3_000,
            max: 300_000
        }),
        keepPageOpen: normalizeKeepPageOpen(input?.keepPageOpen),
        includeDebugInfo: normalizeIncludeDebugInfo(input?.includeDebugInfo)
    };
}

function buildTemuPublishDetailPageUrl(spuId) {
    return `${TEMU_PUBLISH_DETAIL_PAGE_URL}${encodeURIComponent(String(spuId || '').trim())}`;
}

function normalizeTemuRequestHeaders(headers = {}) {
    return Object.fromEntries(
        Object.entries(headers || {}).map(([key, value]) => [
            String(key || '').toLowerCase(),
            String(value || '').trim()
        ])
    );
}

function extractUrlQueryParams(url = '') {
    try {
        const parsedUrl = new URL(String(url || '').trim());
        const query = {};

        for (const [key, value] of parsedUrl.searchParams.entries()) {
            if (!(key in query)) {
                query[key] = value;
                continue;
            }

            if (Array.isArray(query[key])) {
                query[key].push(value);
                continue;
            }

            query[key] = [query[key], value];
        }

        return query;
    } catch {
        return {};
    }
}

function normalizeRequestBody(rawBody = '') {
    const bodyText = String(rawBody || '').trim();
    if (!bodyText) {
        return {
            postData: '',
            postDataJson: null,
            postDataForm: null
        };
    }

    try {
        return {
            postData: bodyText,
            postDataJson: JSON.parse(bodyText),
            postDataForm: null
        };
    } catch {
        // ignore json parse errors
    }

    try {
        const formEntries = Array.from(new URLSearchParams(bodyText).entries());
        if (formEntries.length) {
            return {
                postData: bodyText,
                postDataJson: null,
                postDataForm: Object.fromEntries(formEntries)
            };
        }
    } catch {
        // ignore form parse errors
    }

    return {
        postData: bodyText,
        postDataJson: null,
        postDataForm: null
    };
}

function buildTemuCapturedRequest(request, matchedKeyword = '') {
    const requestUrl = String(request?.url?.() || '').trim();
    const rawPostData = String(request?.postData?.() || '').trim();
    let postDataJson = null;

    try {
        postDataJson = request?.postDataJSON?.() ?? null;
    } catch {
        postDataJson = null;
    }

    const normalizedBody = normalizeRequestBody(rawPostData);
    return {
        capturedAt: new Date().toISOString(),
        matchedKeyword,
        url: requestUrl,
        method: String(request?.method?.() || '').trim().toUpperCase() || 'GET',
        resourceType: String(request?.resourceType?.() || '').trim().toLowerCase(),
        frameUrl: String(request?.frame?.()?.url?.() || '').trim(),
        headers: normalizeTemuRequestHeaders(request?.headers?.() || {}),
        query: extractUrlQueryParams(requestUrl),
        postData: normalizedBody.postData,
        postDataJson: postDataJson ?? normalizedBody.postDataJson,
        postDataForm: normalizedBody.postDataForm
    };
}

function createTemuMatchedRequestCapture(context, options = {}) {
    const requestKeywords = normalizeStringList(options?.requestKeywords || options?.requestKeyword);
    const normalizedKeywords = requestKeywords.map((item) => ({
        raw: item,
        normalized: item.toLowerCase()
    }));
    const state = {
        requestKeywords,
        observedRequestCount: 0,
        matchedRequestCount: 0,
        lastObservedRequestUrl: '',
        lastMatchedRequest: null,
        matchedRequests: []
    };

    const onRequest = (request) => {
        try {
            const url = String(request?.url?.() || '').trim();
            const resourceType = String(request?.resourceType?.() || '').trim().toLowerCase();
            if (!url || !/temu\.com|kuajingmaihuo\.com/i.test(url)) {
                return;
            }
            if (!TEMU_REQUEST_CAPTURE_RESOURCE_TYPES.includes(resourceType)) {
                return;
            }

            state.observedRequestCount += 1;
            state.lastObservedRequestUrl = url;

            const matchedKeyword = normalizedKeywords.find((keyword) => {
                return url.toLowerCase().includes(keyword.normalized);
            });
            if (!matchedKeyword) {
                return;
            }

            const matchedRequest = buildTemuCapturedRequest(request, matchedKeyword.raw);
            state.matchedRequestCount += 1;
            state.lastMatchedRequest = matchedRequest;

            if (state.matchedRequests.length < 12) {
                state.matchedRequests.push(matchedRequest);
            }
        } catch {
            // ignore request capture errors
        }
    };

    context.on('request', onRequest);

    return {
        state,
        clear() {
            state.observedRequestCount = 0;
            state.matchedRequestCount = 0;
            state.lastObservedRequestUrl = '';
            state.lastMatchedRequest = null;
            state.matchedRequests = [];
        },
        dispose() {
            context.off('request', onRequest);
        }
    };
}

async function waitForTemuMatchedRequest(captureState, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const matchedRequests = Array.isArray(captureState?.matchedRequests)
            ? captureState.matchedRequests
            : [];
        if (matchedRequests.length) {
            return {
                success: true,
                matchedRequest: matchedRequests[0],
                observedRequestCount: captureState.observedRequestCount || 0,
                matchedRequestCount: captureState.matchedRequestCount || 0,
                matchedRequests
            };
        }

        await sleep(250);
    }

    return {
        success: false,
        matchedRequest: captureState?.lastMatchedRequest || null,
        observedRequestCount: captureState?.observedRequestCount || 0,
        matchedRequestCount: captureState?.matchedRequestCount || 0,
        matchedRequests: Array.isArray(captureState?.matchedRequests)
            ? captureState.matchedRequests
            : []
    };
}

async function clickTemuTriggerByText(page, texts = [], timeoutMs = TEMU_REQUEST_CAPTURE_CLICK_TIMEOUT) {
    const deadline = Date.now() + timeoutMs;
    const candidates = normalizeStringList(texts);

    while (Date.now() < deadline) {
        const clicked = await clickClickableByText(page, candidates, {
            selector: 'button,[role="button"],a,span,div',
            exact: false
        });
        if (clicked) {
            return {
                success: true,
                detail: clicked
            };
        }

        await page.waitForTimeout(400);
    }

    return {
        success: false,
        reason: 'button_text_not_found',
        buttonTexts: candidates
    };
}

async function clickTemuTriggerBySelector(page, selector = '', timeoutMs = TEMU_REQUEST_CAPTURE_CLICK_TIMEOUT) {
    const selectors = normalizeStringList(selector);
    const matched = await waitForVisibleSelector(page, selectors, timeoutMs);
    if (!matched) {
        return {
            success: false,
            reason: 'button_selector_not_found',
            buttonSelector: selectors.join(', ')
        };
    }

    const clicked = await clickVisibleSelector(page, selectors, {
        timeout: 5_000
    });
    if (clicked) {
        return {
            success: true,
            detail: clicked
        };
    }

    return {
        success: false,
        reason: 'button_selector_click_failed',
        buttonSelector: selectors.join(', ')
    };
}

async function triggerTemuPublishDetailRequestCapture(page, settings = {}) {
    if (settings.triggerMode === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_PAGE_LOAD) {
        return {
            success: true,
            skipped: true,
            triggerMode: settings.triggerMode,
            message: '已启用页面加载阶段侦听'
        };
    }

    if (settings.triggerMode === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_MANUAL) {
        return {
            success: true,
            skipped: true,
            triggerMode: settings.triggerMode,
            message: '页面已打开，请在侦听超时前手动触发目标操作'
        };
    }

    if (settings.triggerMode === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_BUTTON_TEXT) {
        return await clickTemuTriggerByText(page, settings.buttonTexts, TEMU_REQUEST_CAPTURE_CLICK_TIMEOUT);
    }

    if (settings.triggerMode === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_SELECTOR) {
        return await clickTemuTriggerBySelector(page, settings.buttonSelector, TEMU_REQUEST_CAPTURE_CLICK_TIMEOUT);
    }

    return {
        success: false,
        reason: 'unsupported_trigger_mode',
        triggerMode: settings.triggerMode
    };
}

function buildCompactTemuSessionBundle(sessionBundle = {}) {
    return {
        collectedAt: sessionBundle?.collectedAt || '',
        currentUrl: sessionBundle?.currentUrl || '',
        mallId: sessionBundle?.mallId || '',
        mallName: sessionBundle?.mallName || '',
        mallList: Array.isArray(sessionBundle?.mallList) ? sessionBundle.mallList : [],
        accountId: sessionBundle?.accountId || '',
        accountType: sessionBundle?.accountType || '',
        antiContent: sessionBundle?.antiContent || '',
        userAgent: sessionBundle?.userAgent || '',
        headersTemplate: sessionBundle?.headersTemplate || {},
        regionHeaders: sessionBundle?.regionHeaders || {},
        cookies: sessionBundle?.cookies || {},
        cookies_global: sessionBundle?.cookies_global || sessionBundle?.cookies || {},
        cookies_us: sessionBundle?.cookies_us || {},
        cookies_eu: sessionBundle?.cookies_eu || {}
    };
}

function buildTemuSessionAcquireSettings(input = {}) {
    return {
        ...normalizeTemuSettings(input),
        acquireMode: normalizeTemuSessionAcquireMode(input?.acquireMode),
        keepPageOpen: normalizeKeepPageOpen(input?.keepPageOpen),
        collectRegionCookies: normalizeCollectRegionCookies(input?.collectRegionCookies),
        includeDebugInfo: normalizeIncludeDebugInfo(input?.includeDebugInfo)
    };
}

function buildTemuSessionAcquireResult({
    featureKey,
    profileId,
    currentUrl,
    loginState,
    sessionBundle,
    pageKeptOpen,
    acquireMode,
    includeDebugInfo,
    loginStateBefore,
    executionTrace,
    snapshot
}) {
    const compactSessionBundle = buildCompactTemuSessionBundle(sessionBundle);
    if (!includeDebugInfo) {
        return {
            featureKey,
            profileId: profileId || null,
            currentUrl,
            loginState,
            acquireMode,
            sessionBundle: compactSessionBundle,
            pageKeptOpen
        };
    }

    return {
        featureKey,
        profileId: profileId || null,
        currentUrl,
        pageTitle: snapshot?.title || '',
        loginStateBefore,
        loginState,
        detectedButtons: snapshot?.buttons || [],
        detectedInputs: snapshot?.inputs || [],
        bodyPreview: snapshot?.bodyPreview || '',
        acquireMode,
        sessionBundle: {
            ...compactSessionBundle,
            cookieDomains: sessionBundle?.cookieDomains || [],
            requestCapture: sessionBundle?.requestCapture || {},
            regionCollection: sessionBundle?.regionCollection || {},
            warnings: sessionBundle?.warnings || []
        },
        executionTrace,
        pageKeptOpen
    };
}

export async function runTemuLoginSmallFeature(input = {}, runtimeOptions = {}) {
    const profileId = String(input?.profileId || '').trim() || undefined;
    const settings = {
        ...normalizeTemuSettings(input),
        keepPageOpen: normalizeKeepPageOpen(input?.keepPageOpen)
    };
    const pageOperator = runtimeOptions?.pageOperator || new PageOperator();
    const executionTrace = [];
    const managePage = !runtimeOptions?.page;
    let page = runtimeOptions?.page || null;

    try {
        logger.info(`${PLATFORM_NAME}工具开始执行登录流程`, {
            profileId: profileId || 'default',
            loginUrl: settings.loginUrl,
            keepPageOpen: settings.keepPageOpen,
            reusePage: !managePage,
            hasAccount: !!settings.account,
            hasPassword: !!settings.password
        });
        pushTrace(executionTrace, 'start', 'success', {
            profileId: profileId || null,
            loginUrl: settings.loginUrl,
            keepPageOpen: settings.keepPageOpen,
            reusePage: !managePage
        });

        if (managePage) {
            const browser = await getOrCreateBrowser({ profileId });
            page = await browser.newPage({ foreground: true });
            await pageOperator.setupAntiDetection(page);
            pushTrace(executionTrace, 'open_page', 'success', {
                reusedCurrentPage: false,
                currentUrl: page.url()
            });
        } else {
            pushTrace(executionTrace, 'open_page', 'success', {
                reusedCurrentPage: true,
                currentUrl: page.url()
            });
        }

        const loginPageState = await ensureTemuLoginPage(page, settings.loginUrl);
        pushTrace(executionTrace, 'open_login_page', 'success', loginPageState);

        const loginStateBefore = await resolveTemuLoginState(page);
        pushTrace(executionTrace, 'check_login_state_before', loginStateBefore.loggedIn ? 'success' : 'pending', loginStateBefore);

        const loginResult = await performTemuLogin(page, settings, pageOperator);
        if (!loginResult.success) {
            pushTrace(executionTrace, 'perform_login', 'failed', {
                reason: loginResult.reason,
                currentUrl: page.url()
            });

            const snapshot = await collectTemuFrameworkSnapshot(page);
            return {
                success: false,
                message: loginResult.message || `${PLATFORM_NAME}登录失败`,
                data: {
                    featureKey: 'temu-login',
                    profileId: profileId || null,
                    currentUrl: page.url(),
                    pageTitle: snapshot.title,
                    loginStateBefore,
                    loginState: loginResult.loginState || null,
                    bodyPreview: loginResult.bodyPreview || snapshot.bodyPreview,
                    detectedButtons: snapshot.buttons,
                    detectedInputs: snapshot.inputs,
                    executionTrace,
                    pageKeptOpen: settings.keepPageOpen
                }
            };
        }

        const loginStateAfter = await resolveTemuLoginState(page);
        pushTrace(executionTrace, 'perform_login', 'success', {
            reason: loginResult.reason,
            currentUrl: page.url()
        });
        pushTrace(executionTrace, 'check_login_state_after', loginStateAfter.loggedIn ? 'success' : 'pending', loginStateAfter);

        const snapshot = await collectTemuFrameworkSnapshot(page);
        return {
            success: true,
            message: loginResult.reason === 'already_logged_in'
                ? `${PLATFORM_NAME}当前已登录`
                : `${PLATFORM_NAME}登录流程执行完成`,
            data: {
                featureKey: 'temu-login',
                profileId: profileId || null,
                currentUrl: page.url(),
                pageTitle: snapshot.title,
                loginStateBefore,
                loginState: loginStateAfter,
                detectedButtons: snapshot.buttons,
                detectedInputs: snapshot.inputs,
                bodyPreview: snapshot.bodyPreview,
                executionTrace,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } catch (error) {
        logger.error(`${PLATFORM_NAME}工具执行失败:`, error);
        pushTrace(executionTrace, 'fatal_error', 'failed', {
            message: error?.message || String(error)
        });

        return {
            success: false,
            message: error?.message || `${PLATFORM_NAME}工具执行失败`,
            data: {
                featureKey: 'temu-login',
                profileId: profileId || null,
                currentUrl: page?.url?.() || '',
                executionTrace,
                reusedCurrentPage: !managePage,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } finally {
        if (managePage && page && !settings.keepPageOpen) {
            try {
                await page.close();
            } catch (closeError) {
                logger.warn(`${PLATFORM_NAME}工具关闭页面失败: ${closeError?.message || closeError}`);
            }
        } else if (managePage && page && settings.keepPageOpen) {
            logger.info(`${PLATFORM_NAME}工具保留页面，方便继续调试`);
        }
    }
}

export async function runTemuSessionCollectSmallFeature(input = {}, runtimeOptions = {}) {
    const profileId = String(input?.profileId || '').trim() || undefined;
    const settings = {
        keepPageOpen: normalizeKeepPageOpen(input?.keepPageOpen),
        collectRegionCookies: normalizeCollectRegionCookies(input?.collectRegionCookies),
        includeDebugInfo: normalizeIncludeDebugInfo(input?.includeDebugInfo)
    };
    const pageOperator = runtimeOptions?.pageOperator || new PageOperator();
    const executionTrace = [];
    const managePage = !runtimeOptions?.page;
    let page = runtimeOptions?.page || null;

    try {
        logger.info(`${PLATFORM_NAME}工具开始采集会话`, {
            profileId: profileId || 'default',
            keepPageOpen: settings.keepPageOpen,
            collectRegionCookies: settings.collectRegionCookies,
            includeDebugInfo: settings.includeDebugInfo,
            reusePage: !managePage
        });
        pushTrace(executionTrace, 'start', 'success', {
            profileId: profileId || null,
            keepPageOpen: settings.keepPageOpen,
            collectRegionCookies: settings.collectRegionCookies,
            includeDebugInfo: settings.includeDebugInfo,
            reusePage: !managePage
        });

        if (managePage) {
            const browser = await getOrCreateBrowser({ profileId });
            page = await browser.newPage({ foreground: true });
            await pageOperator.setupAntiDetection(page);
            pushTrace(executionTrace, 'open_page', 'success', {
                reusedCurrentPage: false,
                currentUrl: page.url()
            });
        } else {
            pushTrace(executionTrace, 'open_page', 'success', {
                reusedCurrentPage: true,
                currentUrl: page.url()
            });
        }

        const loginStateBefore = await resolveTemuLoginState(page);
        pushTrace(executionTrace, 'check_login_state_before', loginStateBefore.loggedIn ? 'success' : 'pending', loginStateBefore);

        const sessionResult = await collectTemuSessionBundle(page, {
            collectRegionCookies: settings.collectRegionCookies
        });
        if (!sessionResult.success) {
            pushTrace(executionTrace, 'collect_session_bundle', 'failed', {
                reason: sessionResult.reason,
                currentUrl: page.url()
            });

            const snapshot = await collectTemuFrameworkSnapshot(page);
            const loginStateAfterFailure = await resolveTemuLoginState(page);
            return {
                success: false,
                message: sessionResult.reason === 'login_required'
                    ? `请先登录${PLATFORM_NAME}后再执行会话采集`
                    : sessionResult.message || `${PLATFORM_NAME}会话采集失败`,
                data: {
                    featureKey: 'temu-session-collect',
                    profileId: profileId || null,
                    currentUrl: page.url(),
                    pageTitle: snapshot.title,
                    loginStateBefore,
                    loginState: loginStateAfterFailure,
                    bodyPreview: snapshot.bodyPreview,
                    detectedButtons: snapshot.buttons,
                    detectedInputs: snapshot.inputs,
                    executionTrace,
                    pageKeptOpen: settings.keepPageOpen
                }
            };
        }

        const loginStateAfter = await resolveTemuLoginState(page);
        pushTrace(executionTrace, 'check_login_state_after', loginStateAfter.loggedIn ? 'success' : 'pending', loginStateAfter);

        pushTrace(executionTrace, 'collect_session_bundle', 'success', {
            mallId: sessionResult.sessionBundle?.mallId || '',
            mallCount: sessionResult.sessionBundle?.mallList?.length || 0,
            currentUrl: page.url()
        });

        const snapshot = await collectTemuFrameworkSnapshot(page);
        const compactSessionBundle = buildCompactTemuSessionBundle(sessionResult.sessionBundle);

        if (!settings.includeDebugInfo) {
            return {
                success: true,
                message: `${PLATFORM_NAME}会话采集完成`,
                data: {
                    featureKey: 'temu-session-collect',
                    profileId: profileId || null,
                    currentUrl: page.url(),
                    loginState: loginStateAfter,
                    sessionBundle: compactSessionBundle,
                    pageKeptOpen: settings.keepPageOpen
                }
            };
        }

        return {
            success: true,
            message: `${PLATFORM_NAME}会话采集完成`,
            data: {
                featureKey: 'temu-session-collect',
                profileId: profileId || null,
                currentUrl: page.url(),
                pageTitle: snapshot.title,
                loginStateBefore,
                loginState: loginStateAfter,
                detectedButtons: snapshot.buttons,
                detectedInputs: snapshot.inputs,
                bodyPreview: snapshot.bodyPreview,
                sessionBundle: {
                    ...compactSessionBundle,
                    cookieDomains: sessionResult.sessionBundle?.cookieDomains || [],
                    requestCapture: sessionResult.sessionBundle?.requestCapture || {},
                    regionCollection: sessionResult.sessionBundle?.regionCollection || {},
                    warnings: sessionResult.sessionBundle?.warnings || []
                },
                executionTrace,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } catch (error) {
        logger.error(`${PLATFORM_NAME}会话采集工具执行失败:`, error);
        pushTrace(executionTrace, 'fatal_error', 'failed', {
            message: error?.message || String(error)
        });

        return {
            success: false,
            message: error?.message || `${PLATFORM_NAME}会话采集工具执行失败`,
            data: {
                featureKey: 'temu-session-collect',
                profileId: profileId || null,
                currentUrl: page?.url?.() || '',
                executionTrace,
                reusedCurrentPage: !managePage,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } finally {
        if (managePage && page && !settings.keepPageOpen) {
            try {
                await page.close();
            } catch (closeError) {
                logger.warn(`${PLATFORM_NAME}工具关闭页面失败: ${closeError?.message || closeError}`);
            }
        } else if (managePage && page && settings.keepPageOpen) {
            logger.info(`${PLATFORM_NAME}工具保留页面，方便继续调试`);
        }
    }
}

export async function runTemuSessionAcquireSmallFeature(input = {}, runtimeOptions = {}) {
    const profileId = String(input?.profileId || '').trim() || undefined;
    const settings = buildTemuSessionAcquireSettings(input);
    const pageOperator = runtimeOptions?.pageOperator || new PageOperator();
    const executionTrace = [];
    const managePage = !runtimeOptions?.page;
    let page = runtimeOptions?.page || null;

    try {
        logger.info(`${PLATFORM_NAME}工具开始获取会话`, {
            profileId: profileId || 'default',
            acquireMode: settings.acquireMode,
            keepPageOpen: settings.keepPageOpen,
            collectRegionCookies: settings.collectRegionCookies,
            includeDebugInfo: settings.includeDebugInfo,
            reusePage: !managePage,
            hasAccount: !!settings.account,
            hasPassword: !!settings.password
        });
        pushTrace(executionTrace, 'start', 'success', {
            profileId: profileId || null,
            acquireMode: settings.acquireMode,
            keepPageOpen: settings.keepPageOpen,
            collectRegionCookies: settings.collectRegionCookies,
            includeDebugInfo: settings.includeDebugInfo,
            reusePage: !managePage
        });

        if (managePage) {
            const browser = await getOrCreateBrowser({ profileId });
            page = await browser.newPage({ foreground: true });
            await pageOperator.setupAntiDetection(page);
            pushTrace(executionTrace, 'open_page', 'success', {
                reusedCurrentPage: false,
                currentUrl: page.url()
            });
        } else {
            pushTrace(executionTrace, 'open_page', 'success', {
                reusedCurrentPage: true,
                currentUrl: page.url()
            });
        }

        const loginStateBefore = await resolveTemuLoginState(page);
        pushTrace(executionTrace, 'check_login_state_before', loginStateBefore.loggedIn ? 'success' : 'pending', loginStateBefore);

        let acquireMessage = `${PLATFORM_NAME}会话获取完成`;
        if (settings.acquireMode === TEMU_SESSION_ACQUIRE_MODE_LOGIN) {
            const loginResult = await performTemuLogin(page, settings, pageOperator);
            if (!loginResult.success) {
                pushTrace(executionTrace, 'perform_login', 'failed', {
                    reason: loginResult.reason,
                    currentUrl: page.url()
                });

                const snapshot = await collectTemuFrameworkSnapshot(page);
                return {
                    success: false,
                    message: loginResult.message || `${PLATFORM_NAME}登录失败，无法继续获取会话`,
                    data: {
                        featureKey: 'temu-session-acquire',
                        profileId: profileId || null,
                        currentUrl: page.url(),
                        pageTitle: snapshot.title,
                        loginStateBefore,
                        loginState: loginResult.loginState || null,
                        acquireMode: settings.acquireMode,
                        bodyPreview: loginResult.bodyPreview || snapshot.bodyPreview,
                        detectedButtons: snapshot.buttons,
                        detectedInputs: snapshot.inputs,
                        executionTrace,
                        pageKeptOpen: settings.keepPageOpen
                    }
                };
            }

            pushTrace(executionTrace, 'perform_login', 'success', {
                reason: loginResult.reason,
                currentUrl: page.url()
            });
            acquireMessage = loginResult.reason === 'already_logged_in'
                ? `${PLATFORM_NAME}当前已登录，会话获取完成`
                : `${PLATFORM_NAME}登录并获取会话完成`;
        }

        const sessionResult = await collectTemuSessionBundle(page, {
            collectRegionCookies: settings.collectRegionCookies
        });
        if (!sessionResult.success) {
            pushTrace(executionTrace, 'collect_session_bundle', 'failed', {
                reason: sessionResult.reason,
                currentUrl: page.url()
            });

            const snapshot = await collectTemuFrameworkSnapshot(page);
            const loginStateAfterFailure = await resolveTemuLoginState(page);
            const failureMessage = sessionResult.reason === 'login_required'
                ? settings.acquireMode === TEMU_SESSION_ACQUIRE_MODE_LOGIN
                    ? `请先处理${PLATFORM_NAME}登录验证后再重新获取会话`
                    : `当前环境未登录${PLATFORM_NAME}，请切换为“登录并获取”或先手动登录`
                : sessionResult.message || `${PLATFORM_NAME}会话获取失败`;
            return {
                success: false,
                message: failureMessage,
                data: {
                    featureKey: 'temu-session-acquire',
                    profileId: profileId || null,
                    currentUrl: page.url(),
                    pageTitle: snapshot.title,
                    loginStateBefore,
                    loginState: loginStateAfterFailure,
                    acquireMode: settings.acquireMode,
                    bodyPreview: snapshot.bodyPreview,
                    detectedButtons: snapshot.buttons,
                    detectedInputs: snapshot.inputs,
                    executionTrace,
                    pageKeptOpen: settings.keepPageOpen
                }
            };
        }

        const loginStateAfter = await resolveTemuLoginState(page);
        pushTrace(executionTrace, 'check_login_state_after', loginStateAfter.loggedIn ? 'success' : 'pending', loginStateAfter);
        pushTrace(executionTrace, 'collect_session_bundle', 'success', {
            mallId: sessionResult.sessionBundle?.mallId || '',
            mallCount: sessionResult.sessionBundle?.mallList?.length || 0,
            currentUrl: page.url()
        });

        const snapshot = await collectTemuFrameworkSnapshot(page);
        return {
            success: true,
            message: acquireMessage,
            data: buildTemuSessionAcquireResult({
                featureKey: 'temu-session-acquire',
                profileId,
                currentUrl: page.url(),
                loginState: loginStateAfter,
                sessionBundle: sessionResult.sessionBundle,
                pageKeptOpen: settings.keepPageOpen,
                acquireMode: settings.acquireMode,
                includeDebugInfo: settings.includeDebugInfo,
                loginStateBefore,
                executionTrace,
                snapshot
            })
        };
    } catch (error) {
        logger.error(`${PLATFORM_NAME}会话获取工具执行失败:`, error);
        pushTrace(executionTrace, 'fatal_error', 'failed', {
            message: error?.message || String(error)
        });

        return {
            success: false,
            message: error?.message || `${PLATFORM_NAME}会话获取工具执行失败`,
            data: {
                featureKey: 'temu-session-acquire',
                profileId: profileId || null,
                currentUrl: page?.url?.() || '',
                acquireMode: settings.acquireMode,
                executionTrace,
                reusedCurrentPage: !managePage,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } finally {
        if (managePage && page && !settings.keepPageOpen) {
            try {
                await page.close();
            } catch (closeError) {
                logger.warn(`${PLATFORM_NAME}工具关闭页面失败: ${closeError?.message || closeError}`);
            }
        } else if (managePage && page && settings.keepPageOpen) {
            logger.info(`${PLATFORM_NAME}工具保留页面，方便继续调试`);
        }
    }
}

export async function runTemuPublishDetailRequestCaptureSmallFeature(input = {}, runtimeOptions = {}) {
    const featureKey = 'temu-publish-detail-request-capture';
    const profileId = String(input?.profileId || '').trim() || undefined;
    const settings = buildTemuPublishDetailRequestCaptureSettings(input);
    const pageOperator = runtimeOptions?.pageOperator || new PageOperator();
    const executionTrace = [];
    const managePage = !runtimeOptions?.page;
    let page = runtimeOptions?.page || null;
    let requestCapture = null;

    if (!settings.spuId) {
        return {
            success: false,
            message: '请先提供 spuId',
            data: {
                featureKey,
                profileId: profileId || null,
                executionTrace,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    }

    if (!settings.requestKeywords.length) {
        return {
            success: false,
            message: '系统未配置目标侦听接口',
            data: {
                featureKey,
                profileId: profileId || null,
                spuId: settings.spuId,
                executionTrace,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    }

    if (
        settings.triggerMode === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_BUTTON_TEXT
        && !settings.buttonTexts.length
    ) {
        return {
            success: false,
            message: '系统未配置提交按钮文字',
            data: {
                featureKey,
                profileId: profileId || null,
                spuId: settings.spuId,
                triggerMode: settings.triggerMode,
                executionTrace,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    }

    if (
        settings.triggerMode === TEMU_PUBLISH_DETAIL_TRIGGER_MODE_SELECTOR
        && !settings.buttonSelector
    ) {
        return {
            success: false,
            message: '当前触发方式需要填写按钮选择器',
            data: {
                featureKey,
                profileId: profileId || null,
                spuId: settings.spuId,
                triggerMode: settings.triggerMode,
                executionTrace,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    }

    try {
        const targetUrl = buildTemuPublishDetailPageUrl(settings.spuId);
        logger.info(`${PLATFORM_NAME}工具开始侦听发布详情请求`, {
            profileId: profileId || 'default',
            spuId: settings.spuId,
            triggerMode: settings.triggerMode,
            requestKeywords: settings.requestKeywords,
            captureTimeoutMs: settings.captureTimeoutMs,
            keepPageOpen: settings.keepPageOpen,
            reusePage: !managePage
        });
        pushTrace(executionTrace, 'start', 'success', {
            profileId: profileId || null,
            spuId: settings.spuId,
            triggerMode: settings.triggerMode,
            requestKeywords: settings.requestKeywords,
            captureTimeoutMs: settings.captureTimeoutMs,
            keepPageOpen: settings.keepPageOpen,
            reusePage: !managePage
        });

        if (managePage) {
            const browser = await getOrCreateBrowser({ profileId });
            page = await browser.newPage({ foreground: true });
            await pageOperator.setupAntiDetection(page);
            pushTrace(executionTrace, 'open_page', 'success', {
                reusedCurrentPage: false,
                currentUrl: page.url()
            });
        } else {
            pushTrace(executionTrace, 'open_page', 'success', {
                reusedCurrentPage: true,
                currentUrl: page.url()
            });
        }

        requestCapture = createTemuMatchedRequestCapture(page.context(), {
            requestKeywords: settings.requestKeywords
        });
        pushTrace(executionTrace, 'start_request_capture', 'success', {
            requestKeywords: settings.requestKeywords
        });

        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000
        });
        await page.waitForLoadState('networkidle', {
            timeout: 10_000
        }).catch(() => undefined);
        await page.waitForTimeout(2_500);
        pushTrace(executionTrace, 'open_publish_detail_page', 'success', {
            targetUrl,
            currentUrl: page.url()
        });

        const loginState = await resolveTemuLoginState(page);
        pushTrace(executionTrace, 'check_login_state', loginState.loggedIn ? 'success' : 'pending', loginState);

        if (!loginState.loggedIn) {
            const snapshot = await collectTemuFrameworkSnapshot(page);
            return {
                success: false,
                message: `当前环境未登录${PLATFORM_NAME}，请先登录后再侦听请求`,
                data: {
                    featureKey,
                    profileId: profileId || null,
                    spuId: settings.spuId,
                    targetUrl,
                    currentUrl: page.url(),
                    pageTitle: snapshot.title,
                    loginState,
                    detectedButtons: snapshot.buttons,
                    detectedInputs: snapshot.inputs,
                    bodyPreview: snapshot.bodyPreview,
                    executionTrace,
                    pageKeptOpen: settings.keepPageOpen
                }
            };
        }

        if (settings.triggerMode !== TEMU_PUBLISH_DETAIL_TRIGGER_MODE_PAGE_LOAD) {
            requestCapture.clear();
            pushTrace(executionTrace, 'reset_request_capture', 'success', {
                triggerMode: settings.triggerMode
            });
        }

        const triggerResult = await triggerTemuPublishDetailRequestCapture(page, settings);
        pushTrace(
            executionTrace,
            'trigger_target_action',
            triggerResult.success ? (triggerResult.skipped ? 'pending' : 'success') : 'failed',
            triggerResult
        );

        if (!triggerResult.success) {
            const snapshot = await collectTemuFrameworkSnapshot(page);
            const pageStructure = settings.includeDebugInfo
                ? await collectTemuEditPageStructure(page)
                : undefined;

            return {
                success: false,
                message: '未找到“提交”按钮或点击失败，无法继续侦听商品编辑请求',
                data: {
                    featureKey,
                    profileId: profileId || null,
                    spuId: settings.spuId,
                    targetUrl,
                    currentUrl: page.url(),
                    requestUrl: TEMU_PUBLISH_DETAIL_REQUEST_URL,
                    triggerMode: settings.triggerMode,
                    requestKeywords: settings.requestKeywords,
                    triggerResult,
                    pageTitle: snapshot.title,
                    detectedButtons: snapshot.buttons,
                    detectedInputs: snapshot.inputs,
                    bodyPreview: snapshot.bodyPreview,
                    pageStructure,
                    executionTrace,
                    pageKeptOpen: settings.keepPageOpen
                }
            };
        }

        const captureResult = await waitForTemuMatchedRequest(
            requestCapture.state,
            settings.captureTimeoutMs
        );

        if (!captureResult.success) {
            const snapshot = await collectTemuFrameworkSnapshot(page);
            const pageStructure = settings.includeDebugInfo
                ? await collectTemuEditPageStructure(page)
                : undefined;

            pushTrace(executionTrace, 'capture_target_request', 'failed', {
                requestKeywords: settings.requestKeywords,
                observedRequestCount: captureResult.observedRequestCount,
                matchedRequestCount: captureResult.matchedRequestCount,
                lastObservedRequestUrl: requestCapture.state.lastObservedRequestUrl || ''
            });

            return {
                success: false,
                message: `未在 ${settings.captureTimeoutMs}ms 内捕获到商品编辑请求`,
                data: {
                    featureKey,
                    profileId: profileId || null,
                    spuId: settings.spuId,
                    targetUrl,
                    currentUrl: page.url(),
                    requestUrl: TEMU_PUBLISH_DETAIL_REQUEST_URL,
                    triggerMode: settings.triggerMode,
                    requestKeywords: settings.requestKeywords,
                    triggerResult,
                    pageTitle: snapshot.title,
                    detectedButtons: snapshot.buttons,
                    detectedInputs: snapshot.inputs,
                    bodyPreview: snapshot.bodyPreview,
                    requestCapture: {
                        observedRequestCount: captureResult.observedRequestCount,
                        matchedRequestCount: captureResult.matchedRequestCount,
                        lastObservedRequestUrl: requestCapture.state.lastObservedRequestUrl || '',
                        matchedRequests: captureResult.matchedRequests
                    },
                    pageStructure,
                    executionTrace,
                    pageKeptOpen: settings.keepPageOpen
                }
            };
        }

        pushTrace(executionTrace, 'capture_target_request', 'success', {
            matchedKeyword: captureResult.matchedRequest?.matchedKeyword || '',
            method: captureResult.matchedRequest?.method || '',
            url: captureResult.matchedRequest?.url || ''
        });

        const snapshot = settings.includeDebugInfo
            ? await collectTemuFrameworkSnapshot(page)
            : null;
        const pageStructure = settings.includeDebugInfo
            ? await collectTemuEditPageStructure(page)
            : undefined;

        return {
            success: true,
            message: `${PLATFORM_NAME}商品编辑请求已捕获`,
            data: {
                featureKey,
                profileId: profileId || null,
                spuId: settings.spuId,
                targetUrl,
                requestUrl: TEMU_PUBLISH_DETAIL_REQUEST_URL,
                currentUrl: page.url(),
                loginState,
                triggerMode: settings.triggerMode,
                requestKeywords: settings.requestKeywords,
                triggerResult,
                requestParams: {
                    url: captureResult.matchedRequest?.url || '',
                    method: captureResult.matchedRequest?.method || '',
                    query: captureResult.matchedRequest?.query || {},
                    headers: captureResult.matchedRequest?.headers || {},
                    postData: captureResult.matchedRequest?.postData || '',
                    postDataJson: captureResult.matchedRequest?.postDataJson || null,
                    postDataForm: captureResult.matchedRequest?.postDataForm || {}
                },
                capturedRequest: captureResult.matchedRequest,
                requestCapture: {
                    observedRequestCount: captureResult.observedRequestCount,
                    matchedRequestCount: captureResult.matchedRequestCount,
                    matchedRequests: captureResult.matchedRequests
                },
                pageTitle: snapshot?.title || '',
                pageStructure,
                executionTrace,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } catch (error) {
        logger.error(`${PLATFORM_NAME}发布详情请求侦听工具执行失败:`, error);
        pushTrace(executionTrace, 'fatal_error', 'failed', {
            message: error?.message || String(error)
        });

        return {
            success: false,
            message: error?.message || `${PLATFORM_NAME}发布详情请求侦听工具执行失败`,
            data: {
                featureKey,
                profileId: profileId || null,
                spuId: settings.spuId,
                requestUrl: TEMU_PUBLISH_DETAIL_REQUEST_URL,
                currentUrl: page?.url?.() || '',
                triggerMode: settings.triggerMode,
                requestKeywords: settings.requestKeywords,
                executionTrace,
                reusedCurrentPage: !managePage,
                pageKeptOpen: settings.keepPageOpen
            }
        };
    } finally {
        requestCapture?.dispose?.();

        if (managePage && page && !settings.keepPageOpen) {
            try {
                await page.close();
            } catch (closeError) {
                logger.warn(`${PLATFORM_NAME}工具关闭页面失败: ${closeError?.message || closeError}`);
            }
        } else if (managePage && page && settings.keepPageOpen) {
            logger.info(`${PLATFORM_NAME}工具保留页面，方便继续调试`);
        }
    }
}

export default {
    runTemuLoginSmallFeature,
    runTemuSessionCollectSmallFeature,
    runTemuSessionAcquireSmallFeature,
    runTemuPublishDetailRequestCaptureSmallFeature
};
