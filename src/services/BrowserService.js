/**
 * 浏览器服务 - 管理 Playwright 浏览器实例
 *
 * 目标：复用你电脑“本地浏览器”的登录态（cookie/session）
 *
 * 支持两种模式（通过环境变量选择）：
 * - BROWSER_MODE=persistent (默认): launchPersistentContext 使用 Chrome User Data（需要关闭正在运行的 Chrome，否则 profile 会被占用）
 * - BROWSER_MODE=cdp: connectOverCDP 连接已开启远程调试端口的 Chrome（需你用 --remote-debugging-port 启动）
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import {
    join as pathJoin
} from 'path';
import {
    existsSync,
    rmSync,
    mkdirSync,
    readFileSync
} from 'fs';
import {
    logger
} from '../utils/logger.js';
import os from 'os';

// 全局：Playwright Browser / BrowserContext
let browserInstance = null;    // playwright Browser（cdp模式使用）
let contextInstance = null;    // playwright BrowserContext（persistent/cdp 都会有）
let currentUserDataDir = null; // 当前 user data dir（persistent）
let currentProfileDir = null;
let currentExecutablePath = null;
let currentMode = null;
let currentBrowserName = null;
let currentCdpEndpoint = null;
let connectPromise = null;
let lastConnectError = null;
let currentBrowserOptions = {};
// 浏览器状态管理
let browserStatus = {
    isInitialized: false,
    isConnected: false,
    lastActivity: null,
    pageCount: 0
};

function existsAny(paths = []) {
    for (const p of paths) {
        try {
            if (p && existsSync(p)) return p;
        } catch {
            // ignore
        }
    }
    return null;
}

function getDefaultExecutablePath() {
    if (process.platform === 'win32') {
        const pf = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        const pf64 = process.env.ProgramFiles || 'C:\\Program Files';
        return existsAny([
            pathJoin(pf64, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            pathJoin(pf, 'Google', 'Chrome', 'Application', 'chrome.exe')
        ]) || pathJoin(pf64, 'Google', 'Chrome', 'Application', 'chrome.exe');
    }
    if (process.platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    return '/usr/bin/google-chrome';
}

function getDefaultUserDataDir() {
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || pathJoin(os.homedir(), 'AppData', 'Local');
        return pathJoin(localAppData, 'Google', 'Chrome', 'User Data');
    }
    if (process.platform === 'darwin') {
        return pathJoin(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
    }
    return pathJoin(os.homedir(), '.config', 'google-chrome');
}

function getBrowserMode() {
    return (process.env.BROWSER_MODE || 'persistent').toLowerCase();
}

function buildPersistentLaunchOptions({ profileDir, executablePath }) {
    const args = [
        '--start-maximized',
        '--no-first-run',
        '--no-default-browser-check',
        ...(profileDir ? [`--profile-directory=${profileDir}`] : [])
    ];
    return {
        headless: false,
        executablePath: executablePath,
        args,
        viewport: null,
        ignoreHTTPSErrors: true
    };
}

/**
 * 通过 CDP 将浏览器窗口设为最大化（启动后调用）
 */
async function setBrowserWindowMaximized(context) {
    if (!context) return;
    let page = context.pages()[0];
    const createdPage = !page;
    if (!page) page = await context.newPage();
    try {
        const cdp = await context.newCDPSession(page);
        const { windowId } = await cdp.send('Browser.getWindowForTarget');
        await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });
        logger.info('已通过 CDP 将浏览器窗口设为最大化');
    } catch (e) {
        logger.warn('设置窗口最大化失败（可忽略）:', e?.message || e);
    } finally {
        if (createdPage && page) await page.close().catch(() => { });
    }
}

function withTimeout(promise, ms, label) {
    let t;
    const timeout = new Promise((_, reject) => {
        t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    });
    return Promise.race([promise.finally(() => clearTimeout(t)), timeout]);
}

/** 是否为「浏览器/上下文已关闭」类错误（用户关闭了由本服务启动的窗口后仍用旧引用会报此错） */
function isBrowserClosedError(err) {
    const msg = (err && err.message) ? String(err.message) : '';
    return /Target page, context or browser has been closed/i.test(msg) ||
        /Browser has been closed/i.test(msg) ||
        /Context has been closed/i.test(msg);
}

/**
 * 包装 newPage：若因浏览器/上下文已关闭而失败，则清除旧引用并重新 getOrCreateBrowser 后重试一次
 */
async function newPageWithReconnect(options = {}) {
    try {
        if (!contextInstance) {
            if (browserInstance && typeof browserInstance.contexts === 'function') {
                const ctxs = browserInstance.contexts();
                contextInstance = ctxs[0] || await browserInstance.newContext({ devtools: true, headless: false });
            } else {
                throw new Error('No browser context available');
            }
        }
        return await contextInstance.newPage();
    } catch (err) {
        if (!isBrowserClosedError(err)) throw err;
        logger.warn('检测到浏览器/上下文已关闭，清除引用并尝试重新连接:', err.message);
        contextInstance = null;
        browserInstance = null;
        connectPromise = null;
        browserStatus.isInitialized = false;
        browserStatus.isConnected = false;
        browserStatus.pageCount = 0;
        await getOrCreateBrowser(currentBrowserOptions);
        if (!contextInstance) throw new Error('重新连接后仍无法获取浏览器上下文');
        return await contextInstance.newPage();
    }
}

function tryListProfiles(userDataDir) {
    // 读取 Chrome/Edge 的 "Local State" 来列出 profile 目录（可用于 UI 下拉选择）
    try {
        const localStatePath = pathJoin(userDataDir, 'Local State');
        if (!existsSync(localStatePath)) return [];
        const raw = readFileSync(localStatePath, 'utf-8');
        const json = JSON.parse(raw);
        const infoCache = json?.profile?.info_cache || {};
        return Object.entries(infoCache).map(([dir, info]) => ({
            dir,
            name: info?.name || dir,
            isDefault: dir === 'Default'
        }));
    } catch {
        return [];
    }
}

/**
 * 启动带远程调试端口的 Chrome（仅 --remote-debugging-port，使用默认 profile = 你的登录态）
 * 使用前请先完全关闭 Chrome，否则会提示 profile 被占用。
 */
export function launchWithDebugPort({ port = 9222 }) {
    const exe = getDefaultExecutablePath();
    if (!exe || !existsSync(exe)) {
        throw new Error(`未找到 Chrome 可执行文件: ${exe}，请确认已安装 Google Chrome`);
    }
    const userDataDir =
        (typeof arguments[0] === 'object' && arguments[0] && arguments[0].userDataDir)
            ? String(arguments[0].userDataDir).trim()
            : '';

    const args = [
        '--remote-debugging-address=127.0.0.1',
        `--remote-debugging-port=${port}`,
        ...(userDataDir ? [`--user-data-dir=${userDataDir}`] : [])
    ];

    if (userDataDir) {
        try {
            mkdirSync(userDataDir, { recursive: true });
        } catch (e) {
            throw new Error(`无法创建/访问 user-data-dir: ${userDataDir}，请确认路径可写。原错误: ${e.message}`);
        }
    }

    const child = spawn(exe, args, { stdio: 'ignore', detached: true });
    child.unref();
    const pid = child.pid;
    logger.info(`已启动 Chrome pid=${pid} port=${port}，使用默认 profile`);
    return { port, browserName: 'chrome', pid };
}

/**
 * 检查浏览器是否可用
 */
export async function isBrowserAvailable() {
    if (!contextInstance && !browserInstance) {
        return false;
    }

    try {
        if (browserInstance && !browserInstance.isConnected()) {
            return false;
        }
        const pages = contextInstance ? contextInstance.pages() : await browserInstance.pages();
        browserStatus.isConnected = true;
        browserStatus.pageCount = pages.length;
        browserStatus.lastActivity = Date.now();
        return true;
    } catch (error) {
        browserStatus.isConnected = false;
        browserStatus.pageCount = 0;
        logger.warn('浏览器连接检查失败:', error.message);
        return false;
    }
}

/**
 * 检测现有浏览器窗口
 */
export async function detectExistingBrowser() {
    try {
        // 尝试连接到现有的浏览器实例
        if ((contextInstance || browserInstance) && await isBrowserAvailable()) {
            logger.info('检测到现有浏览器实例，页面数量:', browserStatus.pageCount);
            return {
                newPage: async () => await newPageWithReconnect(currentBrowserOptions)
            };
        }

        // 如果浏览器实例存在但不可用，清理它
        if (browserInstance || contextInstance) {
            logger.info('现有浏览器实例不可用，将重新创建');
            browserInstance = null;
            contextInstance = null;
            browserStatus.isInitialized = false;
            browserStatus.isConnected = false;
        }

        logger.debug('未发现可复用实例，将创建新的 Playwright 实例');
        return null;

    } catch (error) {
        logger.error('检测现有浏览器失败:', error);
        return null;
    }
}

/**
 * 获取或创建浏览器实例
 */
export async function getOrCreateBrowser(options = {}) {
    // Only update options if provided; otherwise keep using the successful options from before
    if (options && Object.keys(options).length > 0) {
        currentBrowserOptions = options;
    } else if (!currentBrowserOptions || Object.keys(currentBrowserOptions).length === 0) {
        // Fallback or initialization if absolutely no options exist
        currentBrowserOptions = options || {};
    }

    // 并发保护：多次点击只跑一次连接
    if (connectPromise) {
        await connectPromise;
        return {
            newPage: async () => await newPageWithReconnect(currentBrowserOptions)
        };
    }

    // 首先尝试检测现有浏览器
    const existingBrowser = await detectExistingBrowser();
    if (existingBrowser) {
        return existingBrowser;
    }

    // 创建新的浏览器实例
    logger.info('启动新的浏览器实例...');

    try {
        const mode = (options.mode || getBrowserMode()).toLowerCase();
        currentMode = mode;
        currentBrowserName = 'chrome';
        lastConnectError = null;

        connectPromise = (async () => {
            if (mode === 'cdp') {
                const endpoint = options.cdpEndpoint || process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222';
                currentCdpEndpoint = endpoint;
                logger.info('使用 CDP 模式连接浏览器:', endpoint);
                // Chrome 启动后端口可能需几秒才就绪，重试连接
                const maxRetries = 10;
                const retryDelayMs = 2000;
                let lastErr;
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        browserInstance = await withTimeout(chromium.connectOverCDP(endpoint), 15000, 'connectOverCDP');
                        break;
                    } catch (e) {
                        lastErr = e;
                        if (i < maxRetries - 1) {
                            logger.info(`CDP 连接失败，${retryDelayMs / 1000} 秒后重试 (${i + 1}/${maxRetries})...`);
                            await new Promise(r => setTimeout(r, retryDelayMs));
                        } else {
                            throw new Error(
                                `连接 Chrome 失败 (ECONNREFUSED)。请确保：(1) 点击「启动并连接」前已完全关闭所有 Chrome 进程（含任务管理器、系统托盘）；` +
                                `(2) 若 Chrome 已打开，请先关闭再重新点击。原错误: ${e.message}`
                            );
                        }
                    }
                }
                contextInstance = browserInstance.contexts()[0] || await browserInstance.newContext({ devtools: true, headless: false });
                await setBrowserWindowMaximized(contextInstance);

                browserStatus.isInitialized = true;
                browserStatus.isConnected = true;
                browserStatus.lastActivity = Date.now();
                browserStatus.pageCount = contextInstance.pages().length;

                currentUserDataDir = null;
                currentProfileDir = null;
                currentExecutablePath = null;

                return;
            }

            // persistent：复用系统 Chrome 的 user data（包含 cookie/session）
            const chromeUserDataDir = options.chromeUserDataDir || process.env.CHROME_USER_DATA_DIR || getDefaultUserDataDir();
            const profileDir = options.chromeProfileDir || process.env.CHROME_PROFILE_DIR || 'Default';
            const executablePath = options.chromeExecutablePath || process.env.CHROME_EXECUTABLE_PATH || getDefaultExecutablePath();

            currentUserDataDir = chromeUserDataDir;
            currentProfileDir = profileDir;
            currentExecutablePath = executablePath;
            currentCdpEndpoint = null;

            logger.info('使用 persistent 模式启动 (复用本机 Chrome profile)');
            logger.info('user data dir:', chromeUserDataDir);
            logger.info('profile dir:', profileDir);
            logger.info('executable:', executablePath);

            try {
                contextInstance = await withTimeout(
                    chromium.launchPersistentContext(
                        chromeUserDataDir,
                        buildPersistentLaunchOptions({ profileDir, executablePath })
                    ),
                    60000,
                    'launchPersistentContext'
                );
            } catch (e) {
                // 常见：浏览器正在运行导致 profile 被占用
                throw new Error(
                    `启动 Chrome 失败（常见原因：Chrome 正在运行占用 profile，或 profileDir 选错）。` +
                    `请先完全关闭 Chrome（含后台进程），并确认 profileDir（Default/Profile 1...）。原错误: ${e.message}`
                );
            }

            await setBrowserWindowMaximized(contextInstance);

            browserStatus.isInitialized = true;
            browserStatus.isConnected = true;
            browserStatus.lastActivity = Date.now();
            browserStatus.pageCount = contextInstance.pages().length;
        })();

        try {
            await connectPromise;
        } catch (e) {
            lastConnectError = e?.message || String(e);
            throw e;
        } finally {
            connectPromise = null;
        }

        return { newPage: async () => await newPageWithReconnect(currentBrowserOptions) };

    } catch (error) {
        logger.error('浏览器启动失败:', error);
        throw error;
    }
}

/**
 * 定时检测浏览器实例是否存活；若已断开则清除引用，可选自动重连（通过接口调用）
 * @param { { reconnect?: boolean } } options - reconnect 为 true 时在断开后尝试重新 getOrCreateBrowser（CDP 模式下会重连端口）
 * @returns { Promise<{ available: boolean, reconnected?: boolean, message?: string, status?: object }> }
 */
export async function checkAndReconnectBrowser(options = {}) {
    const { reconnect = false } = options;
    if (!contextInstance && !browserInstance) {
        return { available: false, message: '无浏览器实例' };
    }
    const available = await isBrowserAvailable();
    if (available) {
        return { available: true, status: await getBrowserStatus() };
    }
    logger.info('浏览器实例已断开，清除引用');
    contextInstance = null;
    browserInstance = null;
    connectPromise = null;
    browserStatus.isInitialized = false;
    browserStatus.isConnected = false;
    browserStatus.pageCount = 0;

    if (reconnect) {
        try {
            await getOrCreateBrowser(currentBrowserOptions);
            const ok = await isBrowserAvailable();
            if (ok) {
                logger.info('浏览器已重新连接');
                return { available: true, reconnected: true, status: await getBrowserStatus() };
            }
        } catch (e) {
            logger.warn('自动重连失败:', e?.message || e);
            return { available: false, reconnected: false, message: e?.message || '重连失败' };
        }
    }
    return { available: false, message: '浏览器已断开，引用已清除。可调用连接接口或带 reconnect: true 的检测接口重连。' };
}

/**
 * 获取浏览器状态信息
 */
export async function getBrowserStatus() {
    let pagesInfo = [];
    try {
        const pages = contextInstance ? contextInstance.pages() : (browserInstance ? browserInstance.pages() : []);
        pagesInfo = await Promise.all(pages.map(async (p) => {
            try {
                // Use Promise.race with timeout to avoid hanging on destroyed contexts
                const titlePromise = p.title().catch(() => 'Unknown');
                const urlPromise = p.url();
                const [title, url] = await Promise.all([
                    Promise.race([titlePromise, new Promise(resolve => setTimeout(() => resolve('Loading...'), 1000))]),
                    Promise.resolve(urlPromise)
                ]);
                return { title, url };
            } catch {
                return { title: 'Unknown', url: 'Unknown' };
            }
        }));
    } catch (e) {
        logger.debug('获取页面信息失败（可能正在导航）:', e?.message);
        pagesInfo = [];
    }

    return {
        ...browserStatus,
        hasInstance: !!browserInstance || !!contextInstance,
        connecting: !!connectPromise,
        lastError: lastConnectError,
        connection: {
            mode: currentMode,
            browserName: currentBrowserName,
            executablePath: currentExecutablePath,
            userDataDir: currentUserDataDir,
            profileDir: currentProfileDir,
            cdpEndpoint: currentCdpEndpoint,
            detectedProfiles: currentUserDataDir ? tryListProfiles(currentUserDataDir) : []
        },
        pages: pagesInfo,
        timestamp: new Date().toISOString()
    };
}

/**
 * 更新浏览器活动状态
 */
export function updateBrowserActivity() {
    browserStatus.lastActivity = Date.now();
    try {
        const pages = contextInstance ? contextInstance.pages() : (browserInstance ? browserInstance.pages() : []);
        browserStatus.pageCount = pages.length;
    } catch {
        browserStatus.pageCount = 0;
    }
}

/**
 * 保持浏览器窗口打开（不关闭）
 */
export function keepBrowserOpen() {
    logger.info('浏览器窗口将保持打开状态');
    // 不执行任何关闭操作
}

/**
 * 关闭浏览器实例
 */
export async function closeBrowser() {
    try {
        if (contextInstance) {
            try {
                await contextInstance.close();
                logger.info('BrowserContext 已关闭');
            } catch (e) {
                logger.warn('关闭 BrowserContext 失败:', e.message);
            } finally {
                contextInstance = null;
            }
        }
        if (browserInstance) {
            try {
                await browserInstance.close();
                logger.info('Browser 已关闭');
            } catch (e) {
                logger.warn('关闭 Browser 失败:', e.message);
            } finally {
                browserInstance = null;
            }
        }

        browserStatus.isInitialized = false;
        browserStatus.isConnected = false;
        browserStatus.pageCount = 0;
        currentUserDataDir = null;
    } catch (error) {
        logger.error('清理浏览器资源时出错:', error);
    }
}

/**
 * 清除用户数据
 */
export async function clearUserData() {
    try {
        // 先关闭浏览器
        await closeBrowser();

        // ⚠️ 保护：避免误删你真实 Chrome 的 user data。
        // 如确需清理，请通过环境变量明确指定目录。
        const userDataDir = process.env.CLEAR_USER_DATA_DIR;
        if (!userDataDir) {
            throw new Error('为避免误删本机 Chrome 数据，请通过环境变量 CLEAR_USER_DATA_DIR 指定要清除的目录');
        }

        // 删除用户数据目录
        if (existsSync(userDataDir)) {
            rmSync(userDataDir, {
                recursive: true,
                force: true
            });
            logger.info('用户数据目录已删除:', userDataDir);
        }

        // 重置当前用户数据目录
        currentUserDataDir = null;

        return {
            success: true,
            userDataDir
        };
    } catch (error) {
        logger.error('清除用户数据失败:', error);
        throw error;
    }
}


/**
 * 清理资源
 */
export async function cleanup() {
    await closeBrowser();
}

// 导出默认的浏览器服务类
export class BrowserService {
    static async getOrCreateBrowser(options = {}) {
        return getOrCreateBrowser(options);
    }

    static async close() {
        return closeBrowser();
    }

    static async clearUserData() {
        return clearUserData();
    }

    static async getStatus() {
        return await getBrowserStatus();
    }

    static async cleanup() {
        return cleanup();
    }

    static async isBrowserAvailable() {
        return isBrowserAvailable();
    }

    static async detectExistingBrowser() {
        return detectExistingBrowser();
    }

    static launchWithDebugPort(options = {}) {
        return launchWithDebugPort(options);
    }

    static updateActivity() {
        return updateBrowserActivity();
    }

    static keepOpen() {
        return keepBrowserOpen();
    }
}