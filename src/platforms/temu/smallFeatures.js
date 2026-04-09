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

function normalizeKeepPageOpen(value) {
    if (value === undefined || value === null || value === '') {
        return true;
    }
    return normalizeBoolean(value);
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
        logger.info(`${PLATFORM_NAME}小功能开始执行登录流程`, {
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
            page = await browser.newPage();
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
        logger.error(`${PLATFORM_NAME}小功能执行失败:`, error);
        pushTrace(executionTrace, 'fatal_error', 'failed', {
            message: error?.message || String(error)
        });

        return {
            success: false,
            message: error?.message || `${PLATFORM_NAME}小功能执行失败`,
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
                logger.warn(`${PLATFORM_NAME}小功能关闭页面失败: ${closeError?.message || closeError}`);
            }
        } else if (managePage && page && settings.keepPageOpen) {
            logger.info(`${PLATFORM_NAME}小功能保留页面，方便继续调试`);
        }
    }
}

export default {
    runTemuLoginSmallFeature
};
