import { logger } from './logger.js';

const DEFAULT_BACKGROUND_PAGE_TIMEOUT_MS = 5000;
const patchedContexts = new WeakSet();
const originalNewPageMethods = new WeakMap();

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeTimeout(value) {
    const timeout = Number(value);
    if (!Number.isFinite(timeout) || timeout <= 0) {
        return DEFAULT_BACKGROUND_PAGE_TIMEOUT_MS;
    }
    return timeout;
}

function mergePageOptions(defaultOptions = {}, pageOptions = {}) {
    return {
        ...(isPlainObject(defaultOptions) ? defaultOptions : {}),
        ...(isPlainObject(pageOptions) ? pageOptions : {})
    };
}

function getOriginalNewPage(context) {
    const cached = originalNewPageMethods.get(context);
    if (cached) {
        return cached;
    }

    if (!context || typeof context.newPage !== 'function') {
        throw new Error('浏览器上下文不支持 newPage');
    }

    const original = context.newPage.bind(context);
    originalNewPageMethods.set(context, original);
    return original;
}

function shouldCreateBackgroundPage(options = {}) {
    if (options.headless === true) {
        return false;
    }

    if (options.activate === true || options.foreground === true) {
        return false;
    }

    return options.background !== false;
}

async function tryCreateBackgroundPage(context, options = {}) {
    if (!shouldCreateBackgroundPage(options)) {
        return null;
    }

    const browser = typeof context?.browser === 'function' ? context.browser() : null;
    if (!browser || typeof browser.newBrowserCDPSession !== 'function') {
        return null;
    }

    const browserContexts = typeof browser.contexts === 'function' ? browser.contexts() : [];
    if (Array.isArray(browserContexts) && browserContexts.length > 1 && browserContexts[0] !== context) {
        return null;
    }

    const timeout = normalizeTimeout(options.timeoutMs);
    const pagePromise = typeof context.waitForEvent === 'function'
        ? context.waitForEvent('page', { timeout }).catch(() => null)
        : null;

    if (!pagePromise) {
        return null;
    }

    let cdpSession = null;
    try {
        cdpSession = await browser.newBrowserCDPSession();
    } catch (error) {
        logger.debug(`创建浏览器级 CDP 会话失败，将回退为普通建页: ${error?.message || error}`);
        return null;
    }

    try {
        const { targetId } = await cdpSession.send('Target.createTarget', {
            url: 'about:blank',
            newWindow: false,
            background: true
        });
        const page = await pagePromise;
        if (page) {
            return page;
        }

        await cdpSession.send('Target.closeTarget', { targetId }).catch(() => { });
        return null;
    } catch (error) {
        logger.debug(`后台创建页面失败，将回退为普通建页: ${error?.message || error}`);
        return null;
    } finally {
        await cdpSession?.detach?.().catch(() => { });
    }
}

export async function createContextPage(context, options = {}) {
    const finalOptions = mergePageOptions({}, options);
    const backgroundPage = await tryCreateBackgroundPage(context, finalOptions);
    if (backgroundPage) {
        return backgroundPage;
    }

    return await getOriginalNewPage(context)();
}

export function patchContextNewPage(context, defaultOptions = {}) {
    if (!context || typeof context.newPage !== 'function') {
        return context;
    }

    if (patchedContexts.has(context)) {
        return context;
    }

    getOriginalNewPage(context);
    context.newPage = async (pageOptions = {}) => {
        const finalOptions = mergePageOptions(defaultOptions, pageOptions);
        return await createContextPage(context, finalOptions);
    };
    patchedContexts.add(context);
    return context;
}
