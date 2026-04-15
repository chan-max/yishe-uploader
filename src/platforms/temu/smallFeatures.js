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
    collectTemuFrameworkSnapshot
} from './page.js';
import {
    collectTemuSessionBundle
} from './session.js';

const TEMU_SESSION_ACQUIRE_MODE_DIRECT = 'direct';
const TEMU_SESSION_ACQUIRE_MODE_LOGIN = 'login';

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

export default {
    runTemuLoginSmallFeature,
    runTemuSessionCollectSmallFeature,
    runTemuSessionAcquireSmallFeature
};
