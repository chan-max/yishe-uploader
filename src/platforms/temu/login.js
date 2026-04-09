import {
    PLATFORM_NAME,
    TEMU_LOGGED_IN_SELECTORS,
    TEMU_LOGIN_URL_KEYWORDS,
    TEMU_LOGIN_PASSWORD_SELECTORS,
    TEMU_CATEGORY_KEYWORD_INPUT_SELECTORS,
    TEMU_LOGIN_MODE_LABELS,
    TEMU_LOGIN_SUCCESS_TIMEOUT,
    TEMU_LOGIN_ACCOUNT_SELECTORS,
    TEMU_LOGIN_SUBMIT_SELECTORS,
    TEMU_LOGIN_SUBMIT_LABELS,
    TEMU_LOGIN_RISK_KEYWORDS,
    TEMU_LOGIN_FAILURE_KEYWORDS,
    TEMU_EDIT_URL_KEYWORD
} from './constants.js';
import {
    limitText
} from './utils.js';
import {
    getBodyPreviewText,
    findFirstVisibleSelector,
    clickVisibleSelector,
    clickClickableByText,
    collectTemuFrameworkSnapshot
} from './page.js';
import {
    logger
} from '../../utils/logger.js';

export async function resolveTemuLoginState(page) {
    const currentUrl = String(page.url() || '');
    const userSelector = await findFirstVisibleSelector(page, TEMU_LOGGED_IN_SELECTORS);
    if (userSelector) {
        return {
            loggedIn: true,
            currentUrl,
            reason: 'user_selector_detected',
            matchedSelector: userSelector.selector
        };
    }

    if (TEMU_LOGIN_URL_KEYWORDS.some((keyword) => currentUrl.includes(keyword))) {
        return {
            loggedIn: false,
            currentUrl,
            reason: 'login_url_detected'
        };
    }

    const passwordInput = await findFirstVisibleSelector(page, TEMU_LOGIN_PASSWORD_SELECTORS);
    if (passwordInput) {
        return {
            loggedIn: false,
            currentUrl,
            reason: 'password_input_detected',
            matchedSelector: passwordInput.selector
        };
    }

    const categoryInput = await findFirstVisibleSelector(page, TEMU_CATEGORY_KEYWORD_INPUT_SELECTORS);
    if (categoryInput) {
        return {
            loggedIn: true,
            currentUrl,
            reason: 'category_input_detected',
            matchedSelector: categoryInput.selector
        };
    }

    if (currentUrl.includes(TEMU_EDIT_URL_KEYWORD)) {
        return {
            loggedIn: true,
            currentUrl,
            reason: 'edit_page_url_detected'
        };
    }

    const bodyText = await getBodyPreviewText(page, 1200);
    if (/登录|sign in|log in/i.test(bodyText)) {
        return {
            loggedIn: false,
            currentUrl,
            reason: 'login_text_detected',
            bodyPreview: bodyText
        };
    }

    return {
        loggedIn: currentUrl.includes('agentseller.temu.com'),
        currentUrl,
        reason: currentUrl.includes('agentseller.temu.com') ? 'seller_domain_fallback' : 'non_seller_page',
        bodyPreview: limitText(bodyText, 240)
    };
}

async function switchTemuLoginMode(page) {
    const existingPasswordInput = await findFirstVisibleSelector(page, TEMU_LOGIN_PASSWORD_SELECTORS);
    if (existingPasswordInput) {
        return {
            switched: false,
            reason: 'password_form_already_visible'
        };
    }

    const clicked = await clickClickableByText(page, TEMU_LOGIN_MODE_LABELS);
    if (!clicked) {
        return {
            switched: false,
            reason: 'login_mode_switch_not_found'
        };
    }

    await page.waitForTimeout(1200);
    return {
        switched: true,
        reason: 'login_mode_clicked',
        clickedText: clicked.text
    };
}

async function waitForTemuLoginForm(page, timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs;
    let switchAttempted = false;

    while (Date.now() < deadline) {
        const loginState = await resolveTemuLoginState(page);
        if (loginState.loggedIn) {
            return {
                ready: false,
                alreadyLoggedIn: true,
                loginState
            };
        }

        const accountInput = await findFirstVisibleSelector(page, TEMU_LOGIN_ACCOUNT_SELECTORS);
        const passwordInput = await findFirstVisibleSelector(page, TEMU_LOGIN_PASSWORD_SELECTORS);
        if (accountInput && passwordInput) {
            return {
                ready: true,
                accountSelector: accountInput.selector,
                passwordSelector: passwordInput.selector
            };
        }

        if (!switchAttempted) {
            const switchResult = await switchTemuLoginMode(page);
            switchAttempted = switchResult.switched || switchResult.reason === 'login_mode_switch_not_found';
            if (switchResult.switched) {
                logger.info(`${PLATFORM_NAME}已尝试切换到账号密码登录模式`, switchResult);
            }
        }

        await page.waitForTimeout(800);
    }

    return {
        ready: false,
        alreadyLoggedIn: false
    };
}

async function waitForTemuLoginSuccess(page, timeoutMs = TEMU_LOGIN_SUCCESS_TIMEOUT) {
    const deadline = Date.now() + timeoutMs;
    let lastState = null;

    while (Date.now() < deadline) {
        lastState = await resolveTemuLoginState(page);
        if (lastState.loggedIn) {
            return {
                success: true,
                loginState: lastState
            };
        }

        const bodyPreview = await getBodyPreviewText(page, 800);
        if (TEMU_LOGIN_RISK_KEYWORDS.some((keyword) => bodyPreview.includes(keyword))) {
            return {
                success: false,
                reason: 'manual_verification_required',
                bodyPreview
            };
        }
        if (TEMU_LOGIN_FAILURE_KEYWORDS.some((keyword) => bodyPreview.toLowerCase().includes(keyword.toLowerCase()))) {
            return {
                success: false,
                reason: 'credential_rejected',
                bodyPreview
            };
        }

        await page.waitForTimeout(1000);
    }

    return {
        success: false,
        reason: 'login_timeout',
        loginState: lastState
    };
}

export async function performTemuLogin(page, settings, pageOperator) {
    if (!settings.account || !settings.password) {
        return {
            success: false,
            reason: 'missing_credentials',
            message: `已开启${PLATFORM_NAME}自动登录，但账号或密码为空`
        };
    }

    logger.info(`${PLATFORM_NAME}准备执行自动登录`, {
        account: settings.account,
        currentUrl: page.url()
    });

    const formState = await waitForTemuLoginForm(page);
    if (formState.alreadyLoggedIn) {
        return {
            success: true,
            reason: 'already_logged_in',
            loginState: formState.loginState
        };
    }

    if (!formState.ready) {
        const snapshot = await collectTemuFrameworkSnapshot(page);
        return {
            success: false,
            reason: 'login_form_not_found',
            message: `未找到${PLATFORM_NAME}账号密码登录表单`,
            snapshot
        };
    }

    await pageOperator.fillInput(page, formState.accountSelector || TEMU_LOGIN_ACCOUNT_SELECTORS, settings.account, {
        delay: 60
    });
    await page.waitForTimeout(400);
    await pageOperator.fillInput(page, formState.passwordSelector || TEMU_LOGIN_PASSWORD_SELECTORS, settings.password, {
        delay: 60
    });
    await page.waitForTimeout(600);

    const submitBySelector = await clickVisibleSelector(page, TEMU_LOGIN_SUBMIT_SELECTORS);
    if (!submitBySelector) {
        const submitByText = await clickClickableByText(page, TEMU_LOGIN_SUBMIT_LABELS);
        if (!submitByText) {
            return {
                success: false,
                reason: 'login_submit_not_found',
                message: `未找到${PLATFORM_NAME}登录提交按钮`
            };
        }
    }

    await page.waitForTimeout(1500);

    const successState = await waitForTemuLoginSuccess(page);
    if (!successState.success) {
        return {
            success: false,
            reason: successState.reason,
            message: successState.reason === 'manual_verification_required'
                ? `${PLATFORM_NAME}登录触发安全验证，请先在浏览器里手动完成验证后再重试`
                : successState.reason === 'credential_rejected'
                    ? `${PLATFORM_NAME}登录失败，账号或密码可能不正确`
                    : `${PLATFORM_NAME}登录超时，未确认登录成功`,
            bodyPreview: successState.bodyPreview,
            loginState: successState.loginState
        };
    }

    logger.info(`${PLATFORM_NAME}自动登录成功`, successState.loginState);
    return {
        success: true,
        reason: 'login_success',
        loginState: successState.loginState
    };
}
