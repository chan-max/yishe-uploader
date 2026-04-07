/**
 * 浏览器服务 - 管理 Playwright 浏览器实例
 *
 * 默认目标：使用程序内置的 Playwright Chromium，并通过持久化 user data 复用登录态
 *
 * 支持两种模式（通过环境变量选择）：
 * - BROWSER_MODE=bundled (默认): launchPersistentContext 使用 Playwright 内置 Chromium + 独立 user data dir
 * - BROWSER_MODE=persistent: launchPersistentContext 使用系统 Chrome User Data（需要关闭正在运行的 Chrome，否则 profile 会被占用）
 * - BROWSER_MODE=cdp: connectOverCDP 连接已开启远程调试端口的 Chrome（需你用 --remote-debugging-port 启动）
 */

import { chromium } from 'playwright';
import { spawn, exec } from 'child_process';
import path from 'path';
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
import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import http from 'http';
import https from 'https';
import {
    getBrowserProfilesWorkspaceDir,
    listBrowserProfiles,
    getBrowserProfile,
    getActiveBrowserProfile,
    ensureDefaultBrowserProfile,
    switchBrowserProfile,
    createBrowserProfile,
    updateBrowserProfile,
    deleteBrowserProfile,
    markBrowserProfileUsed
} from './BrowserProfileService.js';
import {
    checkManagedProfileBrowsers,
    closeManagedProfileBrowser,
    createProfileBrowserPage,
    focusManagedProfileBrowser,
    getManagedProfileBrowserPage,
    getManagedProfileBrowserStatus,
    getOrCreateManagedProfileBrowser,
    hasManagedProfileBrowser,
    isManagedProfileBrowserAvailable,
    listManagedProfileBrowserPages,
    updateManagedProfileBrowserActivity
} from './ManagedProfileBrowserPool.js';

// 全局：Playwright Browser / BrowserContext
let browserInstance = null;    // playwright Browser（cdp模式使用）
let contextInstance = null;    // playwright BrowserContext（persistent/cdp 都会有）
let currentUserDataDir = null; // 当前 user data dir（bundled/persistent）
let currentProfileDir = null;
let currentExecutablePath = null;
let currentMode = null;
let currentBrowserName = null;
let currentBrowserVersion = null;
let currentCdpEndpoint = null;
let currentManagedProfileId = null;
let connectPromise = null;
let lastConnectError = null;
let currentBrowserOptions = {};
const FOCUS_TRACKER_SCRIPT = `
(() => {
  if (globalThis.__yisheFocusTrackerInstalled) {
    return;
  }

  const ensureState = () => {
    const prev = globalThis.__yisheFocusTracker || {};
    const now = Date.now();
    const next = {
      hasFocus: typeof document?.hasFocus === 'function' ? document.hasFocus() : false,
      visibilityState: document?.visibilityState || 'unknown',
      lastFocusAt: Number(prev.lastFocusAt || 0),
      lastBlurAt: Number(prev.lastBlurAt || 0),
      lastVisibleAt: Number(prev.lastVisibleAt || 0),
      updatedAt: now
    };

    if (next.hasFocus && !next.lastFocusAt) next.lastFocusAt = now;
    if (next.visibilityState === 'visible' && !next.lastVisibleAt) next.lastVisibleAt = now;

    globalThis.__yisheFocusTracker = next;
    return next;
  };

  const updateState = (reason) => {
    const prev = ensureState();
    const now = Date.now();
    const next = {
      ...prev,
      hasFocus: typeof document?.hasFocus === 'function' ? document.hasFocus() : false,
      visibilityState: document?.visibilityState || 'unknown',
      updatedAt: now,
      lastReason: reason || 'update'
    };

    if (reason === 'focus' || next.hasFocus) next.lastFocusAt = now;
    if (reason === 'blur') next.lastBlurAt = now;
    if (reason === 'visible' || next.visibilityState === 'visible') next.lastVisibleAt = now;

    globalThis.__yisheFocusTracker = next;
  };

  globalThis.__yisheFocusTrackerInstalled = true;
  ensureState();

  window.addEventListener('focus', () => updateState('focus'), true);
  window.addEventListener('blur', () => updateState('blur'), true);
  document.addEventListener('visibilitychange', () => {
    updateState(document.visibilityState === 'visible' ? 'visible' : 'hidden');
  }, true);
  window.addEventListener('pageshow', () => updateState('pageshow'), true);
  window.addEventListener('load', () => updateState('load'), true);
})();
`;
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

/**
 * 获取默认的 CDP User Data 目录（独立目录，避免与系统 Chrome 冲突）
 */
function getCdpDefaultUserDataDir() {
    const envDir = process.env.YISHE_AUTO_BROWSER_CDP_USER_DATA_DIR || process.env.UPLOADER_CDP_USER_DATA_DIR;
    if (envDir) {
        return envDir;
    }

    return path.resolve(getBrowserProfilesWorkspaceDir(), 'cdp-user-data');
}

function getBrowserMode() {
    return (process.env.BROWSER_MODE || 'bundled').toLowerCase();
}

function shouldUseManagedProfilePool(options = {}) {
    const mode = String(options?.mode || getBrowserMode()).trim().toLowerCase() || 'bundled';
    return mode === 'bundled';
}

function getHeadlessMode() {
    const headlessEnv = process.env.HEADLESS || process.env.BROWSER_HEADLESS;
    if (headlessEnv) {
        return headlessEnv.toLowerCase() === 'true' || headlessEnv === '1';
    }
    return false; // 默认非无头模式
}

function normalizePathLike(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return null;
    }

    try {
        return path.resolve(normalized);
    } catch {
        return normalized;
    }
}

function resolveBundledProfileSelection(options = {}) {
    const explicitProfileId = String(options.profileId || '').trim();
    if (explicitProfileId) {
        const profile = getBrowserProfile(explicitProfileId);
        if (!profile) {
            throw new Error(`指定环境不存在: ${explicitProfileId}`);
        }
        return {
            profileId: profile.id,
            userDataDir: profile.userDataDir,
            profile,
            source: 'profile',
        };
    }

    const activeProfile = getActiveBrowserProfile() || ensureDefaultBrowserProfile();
    if (activeProfile) {
        return {
            profileId: activeProfile.id,
            userDataDir: activeProfile.userDataDir,
            profile: activeProfile,
            source: 'active-profile',
        };
    }

    return {
        profileId: null,
        userDataDir: null,
        profile: null,
        source: 'missing-profile',
    };
}

function resolveDesiredConnectionState(options = {}) {
    const mode = String(options.mode || getBrowserMode()).trim().toLowerCase() || 'bundled';
    if (mode === 'cdp') {
        return {
            mode,
            cdpEndpoint: String(options.cdpEndpoint || process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222').trim(),
        };
    }

    if (mode === 'persistent') {
        return {
            mode,
            userDataDir: normalizePathLike(options.chromeUserDataDir || process.env.CHROME_USER_DATA_DIR || getDefaultUserDataDir()),
            profileDir: String(options.chromeProfileDir || process.env.CHROME_PROFILE_DIR || 'Default').trim() || 'Default',
            executablePath: normalizePathLike(options.chromeExecutablePath || process.env.CHROME_EXECUTABLE_PATH || getDefaultExecutablePath()),
        };
    }

    const bundledSelection = resolveBundledProfileSelection(options);
    return {
        mode,
        userDataDir: normalizePathLike(bundledSelection.userDataDir),
        profileId: bundledSelection.profileId || null,
    };
}

function isHeadlessConnection() {
    if (typeof currentBrowserOptions?.headless === 'boolean') {
        return currentBrowserOptions.headless;
    }
    return getHeadlessMode();
}

async function shouldReconnectForOptions(options = {}) {
    if (!contextInstance && !browserInstance) {
        return false;
    }

    if (!await isBrowserAvailable()) {
        return false;
    }

    const desired = resolveDesiredConnectionState(options);
    const current = {
        mode: currentMode,
        userDataDir: normalizePathLike(currentUserDataDir),
        profileId: currentManagedProfileId || null,
        profileDir: String(currentProfileDir || '').trim() || null,
        executablePath: normalizePathLike(currentExecutablePath),
        cdpEndpoint: String(currentCdpEndpoint || '').trim() || null,
    };

    if (desired.mode !== current.mode) {
        return true;
    }

    if (desired.mode === 'cdp') {
        return desired.cdpEndpoint !== current.cdpEndpoint;
    }

    if (desired.mode === 'persistent') {
        return desired.userDataDir !== current.userDataDir
            || desired.profileDir !== current.profileDir
            || desired.executablePath !== current.executablePath;
    }

    return desired.userDataDir !== current.userDataDir
        || (desired.profileId || null) !== (current.profileId || null);
}

function buildPersistentLaunchOptions({ profileDir, executablePath, headless = false }) {
    const args = [
        '--no-first-run',
        '--no-default-browser-check',
        ...(profileDir ? [`--profile-directory=${profileDir}`] : []),
        ...(!headless ? ['--start-maximized'] : [])
    ];
    
    const launchOptions = {
        headless: headless,
        executablePath: executablePath,
        args,
        ignoreHTTPSErrors: true
    };
    
    // 仅在有界面模式下设置 viewport，无头模式需要显式设置
    if (headless) {
        launchOptions.viewport = { width: 1920, height: 1080 };
    } else {
        launchOptions.viewport = null;
    }
    
    return launchOptions;
}

/**
 * 通过 CDP 将浏览器窗口设为最大化（仅在有界面模式下调用）
 */
async function setBrowserWindowMaximized(context, headless = false) {
    if (!context || headless) return; // 无头模式下跳过
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

function execCommand(command, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        exec(command, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
            if (error) {
                const msg = stderr ? String(stderr).trim() : error.message;
                reject(new Error(msg || error.message));
                return;
            }
            resolve(String(stdout || '').trim());
        });
    });
}

async function checkCdpEndpointAvailable(endpoint = 'http://127.0.0.1:9222') {
    try {
        const targetUrl = new URL('/json/version', endpoint);
        const client = targetUrl.protocol === 'https:' ? https : http;
        return await new Promise((resolve) => {
            const req = client.get(targetUrl, { timeout: 3000 }, (resp) => {
                let data = '';
                resp.on('data', (chunk) => { data += chunk; });
                resp.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({
                            ok: true,
                            endpoint,
                            browser: json.Browser || json.browser || ''
                        });
                    } catch {
                        resolve({
                            ok: true,
                            endpoint,
                            browser: ''
                        });
                    }
                });
            });
            req.on('error', (error) => resolve({ ok: false, endpoint, error: error?.message || '连接失败' }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ ok: false, endpoint, error: '连接超时' });
            });
        });
    } catch (error) {
        return {
            ok: false,
            endpoint,
            error: error?.message || '检测 CDP 端点失败'
        };
    }
}

function resolveActiveBrowserVersion() {
    try {
        if (browserInstance && typeof browserInstance.version === 'function') {
            return browserInstance.version() || null;
        }
    } catch {
        // ignore
    }

    try {
        if (contextInstance && typeof contextInstance.browser === 'function') {
            const browser = contextInstance.browser();
            if (browser && typeof browser.version === 'function') {
                return browser.version() || null;
            }
        }
    } catch {
        // ignore
    }

    return null;
}

async function getListeningPids(port) {
    const pids = new Set();
    if (process.platform === 'win32') {
        let output = '';
        try {
            output = await execCommand(`netstat -ano -p tcp | findstr :${port}`);
        } catch {
            return [];
        }
        const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            if (!line.includes(`:${port}`)) continue;
            const parts = line.split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && /^\d+$/.test(pid)) {
                pids.add(pid);
            }
        }
        return Array.from(pids);
    }

    try {
        const output = await execCommand(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`);
        output.split(/\s+/).filter(Boolean).forEach(pid => pids.add(pid));
        return Array.from(pids);
    } catch (e) {
        const fallback = await execCommand(`sh -lc "ss -lptn 'sport = :${port}' | awk '{print $6}' | sed 's/.*pid=\\([0-9]*\\).*/\\1/'"`);
        fallback.split(/\s+/).filter(Boolean).forEach(pid => pids.add(pid));
        return Array.from(pids);
    }
}

async function killPids(pids = []) {
    const killed = [];
    const errors = [];
    for (const pid of pids) {
        try {
            if (process.platform === 'win32') {
                await execCommand(`taskkill /PID ${pid} /T /F`);
            } else {
                await execCommand(`kill -9 ${pid}`);
            }
            killed.push(pid);
        } catch (e) {
            errors.push({ pid, error: e.message || String(e) });
        }
    }
    return { killed, errors };
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
                const headless = getHeadlessMode();
                const contextOptions = { devtools: !headless };
                // 无头模式下需要指定 viewport
                if (headless) {
                    contextOptions.viewport = { width: 1920, height: 1080 };
                }
                contextInstance = ctxs[0] || await browserInstance.newContext(contextOptions);
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
 * 启动带远程调试端口的 Chrome（仅 --remote-debugging-port，使用指定 user-data-dir 保持登录态）
 * 支持无头模式通过 headless 参数或 HEADLESS 环境变量
 */
export function launchWithDebugPort({ port = 9222, headless = null, userDataDir = null } = {}) {
    const exe = getDefaultExecutablePath();
    if (!exe || !existsSync(exe)) {
        throw new Error(`未找到 Chrome 可执行文件: ${exe}，请确认已安装 Google Chrome`);
    }

    // 使用独立的 user-data-dir 避免与系统 Chrome 冲突，确保登录信息持久化
    const finalUserDataDir = userDataDir || getCdpDefaultUserDataDir();

    // 确定是否使用无头模式
    const useHeadless = headless !== undefined ? headless : getHeadlessMode();
    logger.info(`launchWithDebugPort - 输入 headless: ${headless}, 最终使用 useHeadless: ${useHeadless}`);
    logger.info(`launchWithDebugPort - userDataDir: ${finalUserDataDir}`);
    
    // 确保目录存在
    try {
        mkdirSync(finalUserDataDir, { recursive: true });
    } catch (e) {
        throw new Error(`无法创建/访问 user-data-dir: ${finalUserDataDir}，请确认路径可写。原错误: ${e.message}`);
    }

    const args = [
        '--remote-debugging-address=127.0.0.1',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${finalUserDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        ...(useHeadless ? ['--headless=new'] : [])
    ];

    const child = spawn(exe, args, { stdio: 'ignore', detached: true });
    child.unref();
    const pid = child.pid;
    const modeStr = useHeadless ? '无头' : '有界面';
    logger.info(`已启动 Chrome pid=${pid} port=${port}，模式: ${modeStr}，user-data-dir: ${finalUserDataDir}`);
    return { port, browserName: 'chrome', pid, headless: useHeadless, userDataDir: finalUserDataDir };
}

/**
 * 检查浏览器是否可用
 */
export async function isBrowserAvailable(options = {}) {
    if (shouldUseManagedProfilePool(options)) {
        return await isManagedProfileBrowserAvailable(options?.profileId);
    }

    if (!contextInstance && !browserInstance) {
        return false;
    }

    try {
        if (browserInstance && !browserInstance.isConnected()) {
            return false;
        }
        const pages = await getVisiblePagesDetailed();
        // 在有界面模式下，若已经没有任何可见页，通常意味着用户已手动关闭最后一个浏览器窗口。
        // 这种情况下按“未连接”处理，避免控制端继续误判为可用。
        if (!isHeadlessConnection() && currentMode !== 'cdp' && pages.length === 0) {
            logger.info('浏览器可见页面为 0，按浏览器/上下文已关闭处理');
            browserStatus.isConnected = false;
            browserStatus.pageCount = 0;
            return false;
        }
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
    if (shouldUseManagedProfilePool()) {
        const status = await getManagedProfileBrowserStatus();
        if (status?.hasInstance && status?.isConnected) {
            return {
                newPage: async () => await createProfileBrowserPage(
                    status?.connection?.profileId || status?.connection?.activeProfileId || undefined
                )
            };
        }
        return null;
    }

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
            currentManagedProfileId = null;
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
    if (shouldUseManagedProfilePool(options)) {
        return await getOrCreateManagedProfileBrowser(options);
    }

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

    if (options && Object.keys(options).length > 0 && await shouldReconnectForOptions(options)) {
        logger.info('检测到浏览器环境参数变化，准备关闭当前实例并切换到新环境');
        await closeBrowser();
    }

    // 首先尝试检测现有浏览器
    const existingBrowser = await detectExistingBrowser();
    if (existingBrowser) {
        return existingBrowser;
    }

    const resolvedMode = String(options.mode || getBrowserMode()).trim().toLowerCase() || 'bundled';

    // 冷启动场景：仅在显式请求 CDP 模式时尝试接管现有 CDP 浏览器
    const requestedMode = String(options.mode || '').trim().toLowerCase();
    const shouldProbeCdp = resolvedMode === 'cdp' && (!requestedMode || requestedMode === 'cdp');
    if (shouldProbeCdp) {
        const endpoint = options.cdpEndpoint || process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222';
        const cdpStatus = await checkCdpEndpointAvailable(endpoint);
        if (cdpStatus.ok) {
            logger.info(`检测到可复用的现有 CDP 浏览器，优先接管: ${endpoint}`);
            options = {
                ...options,
                mode: 'cdp',
                cdpEndpoint: endpoint
            };
        }
    }

    // 创建新的浏览器实例
    logger.info('启动新的浏览器实例...');

    try {
        const mode = resolvedMode;
        currentMode = mode;
        currentBrowserName = mode === 'bundled' ? 'chromium' : 'chrome';
        currentBrowserVersion = null;
        lastConnectError = null;

        connectPromise = (async () => {
            const headless = options.headless !== undefined ? options.headless : getHeadlessMode();
            logger.info(`getOrCreateBrowser - options.headless: ${options.headless}, 最终使用 headless: ${headless}`);
            const modeStr = headless ? '无头' : '有界面';

            if (mode === 'cdp') {
                currentBrowserName = 'chrome';
                const endpoint = options.cdpEndpoint || process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222';
                currentCdpEndpoint = endpoint;
                logger.info(`使用 CDP 模式连接浏览器 (${modeStr}):`, endpoint);
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
                const contextOptions = { devtools: !headless };
                if (headless) {
                    contextOptions.viewport = { width: 1920, height: 1080 };
                }
                contextInstance = browserInstance.contexts()[0] || await browserInstance.newContext(contextOptions);
                await installFocusTracker(contextInstance);
                await setBrowserWindowMaximized(contextInstance, headless);

                browserStatus.isInitialized = true;
                browserStatus.isConnected = true;
                browserStatus.lastActivity = Date.now();
                browserStatus.pageCount = (await getVisiblePagesDetailed()).length;

                currentUserDataDir = null;
                currentProfileDir = null;
                currentExecutablePath = null;
                currentManagedProfileId = null;
                currentBrowserVersion = resolveActiveBrowserVersion();

                return;
            }

            if (mode === 'bundled') {
                const bundledSelection = resolveBundledProfileSelection(options);
                const bundledUserDataDir = bundledSelection.userDataDir
                    || process.env.BUNDLED_USER_DATA_DIR
                    || getCdpDefaultUserDataDir();

                currentBrowserName = 'chromium';
                currentUserDataDir = bundledUserDataDir;
                currentProfileDir = null;
                currentExecutablePath = null;
                currentCdpEndpoint = null;
                currentManagedProfileId = bundledSelection.profileId || null;
                if (currentManagedProfileId) {
                    switchBrowserProfile(currentManagedProfileId);
                }

                logger.info(`使用 bundled 模式启动 (Playwright 内置 Chromium, ${modeStr})`);
                logger.info('user data dir:', bundledUserDataDir);
                if (currentManagedProfileId) {
                    logger.info('profile id:', currentManagedProfileId);
                }

                try {
                    contextInstance = await withTimeout(
                        chromium.launchPersistentContext(
                            bundledUserDataDir,
                            buildPersistentLaunchOptions({ headless })
                        ),
                        60000,
                        'launchPersistentContext'
                    );
                } catch (e) {
                    throw new Error(
                        `启动内置 Chromium 失败。请确认 Playwright 浏览器已安装，且 userDataDir 可写。原错误: ${e.message}`
                    );
                }

                await installFocusTracker(contextInstance);
                await setBrowserWindowMaximized(contextInstance, headless);

                browserStatus.isInitialized = true;
                browserStatus.isConnected = true;
                browserStatus.lastActivity = Date.now();
                browserStatus.pageCount = (await getVisiblePagesDetailed()).length;
                currentBrowserVersion = resolveActiveBrowserVersion();
                if (currentManagedProfileId) {
                    markBrowserProfileUsed(currentManagedProfileId, {
                        browserVersion: currentBrowserVersion || '',
                        lastUsedAt: new Date().toISOString(),
                    });
                }
                return;
            }

            // persistent：复用系统 Chrome 的 user data（包含 cookie/session）
            const chromeUserDataDir = options.chromeUserDataDir || process.env.CHROME_USER_DATA_DIR || getDefaultUserDataDir();
            const profileDir = options.chromeProfileDir || process.env.CHROME_PROFILE_DIR || 'Default';
            const executablePath = options.chromeExecutablePath || process.env.CHROME_EXECUTABLE_PATH || getDefaultExecutablePath();

            currentBrowserName = 'chrome';
            currentUserDataDir = chromeUserDataDir;
            currentProfileDir = profileDir;
            currentExecutablePath = executablePath;
            currentCdpEndpoint = null;
            currentManagedProfileId = null;

            logger.info(`使用 persistent 模式启动 (复用本机 Chrome profile, ${modeStr})`);
            logger.info('user data dir:', chromeUserDataDir);
            logger.info('profile dir:', profileDir);
            logger.info('executable:', executablePath);

            try {
                contextInstance = await withTimeout(
                    chromium.launchPersistentContext(
                        chromeUserDataDir,
                        buildPersistentLaunchOptions({ profileDir, executablePath, headless })
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

            await installFocusTracker(contextInstance);
            await setBrowserWindowMaximized(contextInstance, headless);

            browserStatus.isInitialized = true;
            browserStatus.isConnected = true;
            browserStatus.lastActivity = Date.now();
            browserStatus.pageCount = (await getVisiblePagesDetailed()).length;
            currentBrowserVersion = resolveActiveBrowserVersion();
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
    if (shouldUseManagedProfilePool(options)) {
        return await checkManagedProfileBrowsers(options);
    }

    const {
        reconnect = false,
        cdpEndpoint = currentCdpEndpoint || process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222',
        headless = undefined
    } = options;

    if (!contextInstance && !browserInstance) {
        if (!reconnect) {
            return { available: false, message: '无浏览器实例' };
        }

        const cdpStatus = await checkCdpEndpointAvailable(cdpEndpoint);
        if (!cdpStatus.ok) {
            return {
                available: false,
                reconnected: false,
                message: `未检测到可接管的 CDP 浏览器: ${cdpStatus.error || cdpEndpoint}`
            };
        }

        try {
            logger.info(`检测到可复用的 CDP 浏览器，开始自动接管: ${cdpEndpoint}`);
            await getOrCreateBrowser({
                ...currentBrowserOptions,
                mode: 'cdp',
                cdpEndpoint,
                ...(headless !== undefined ? { headless } : {})
            });
            const ok = await isBrowserAvailable();
            if (ok) {
                logger.info('已成功自动接管现有 CDP 浏览器');
                return {
                    available: true,
                    reconnected: true,
                    adopted: true,
                    status: await getBrowserStatus()
                };
            }
        } catch (e) {
            logger.warn('自动接管现有 CDP 浏览器失败:', e?.message || e);
            return {
                available: false,
                reconnected: false,
                message: e?.message || '自动接管失败'
            };
        }

        return {
            available: false,
            reconnected: false,
            message: '检测到 CDP 浏览器，但接管后不可用'
        };
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
            const cdpStatus = await checkCdpEndpointAvailable(cdpEndpoint);
            if (cdpStatus.ok) {
                await getOrCreateBrowser({
                    ...currentBrowserOptions,
                    mode: 'cdp',
                    cdpEndpoint,
                    ...(headless !== undefined ? { headless } : {})
                });
            } else {
                await getOrCreateBrowser(currentBrowserOptions);
            }
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
export async function getBrowserStatus(options = {}) {
    if (shouldUseManagedProfilePool(options)) {
        return await getManagedProfileBrowserStatus(options);
    }

    let pagesInfo = [];
    currentBrowserVersion = resolveActiveBrowserVersion() || currentBrowserVersion;
    const profilesState = listBrowserProfiles();
    const activeProfile = currentManagedProfileId
        ? getBrowserProfile(currentManagedProfileId)
        : (profilesState.activeProfileId ? getBrowserProfile(profilesState.activeProfileId) : null);
    try {
        const visiblePages = await getVisiblePagesDetailed();
        pagesInfo = visiblePages.map(item => ({ title: item.title || 'Unknown', url: item.url || 'Unknown' }));
        browserStatus.pageCount = visiblePages.length;
    } catch (e) {
        logger.debug('获取页面信息失败（可能正在导航）:', e?.message);
        pagesInfo = [];
        browserStatus.pageCount = 0;
    }

    return {
        ...browserStatus,
        hasInstance: !!browserInstance || !!contextInstance,
        connecting: !!connectPromise,
        lastError: lastConnectError,
        connection: {
            mode: currentMode,
            browserName: currentBrowserName,
            browserVersion: currentBrowserVersion,
            executablePath: currentExecutablePath,
            userDataDir: currentUserDataDir,
            profileDir: currentProfileDir,
            profileId: currentManagedProfileId,
            activeProfileId: profilesState.activeProfileId || null,
            cdpEndpoint: currentCdpEndpoint,
            detectedProfiles: currentUserDataDir ? tryListProfiles(currentUserDataDir) : [],
            activeProfile,
        },
        pages: pagesInfo,
        profiles: profilesState.items,
        timestamp: new Date().toISOString()
    };
}

function getPagesInternal() {
    return contextInstance ? contextInstance.pages() : (browserInstance ? browserInstance.pages() : []);
}

async function installFocusTrackerForPage(page) {
    if (!page || (typeof page.isClosed === 'function' && page.isClosed())) return;

    try {
        await page.evaluate(FOCUS_TRACKER_SCRIPT);
    } catch {
        // 页面导航中或尚未可执行脚本时忽略
    }
}

async function installFocusTracker(context) {
    if (!context) return;

    try {
        await context.addInitScript(FOCUS_TRACKER_SCRIPT);
    } catch (error) {
        logger.debug('注入 focus tracker init script 失败:', error?.message || error);
    }

    const pages = typeof context.pages === 'function' ? context.pages() : [];
    await Promise.all(pages.map((page) => installFocusTrackerForPage(page)));
}

function isUserVisiblePage(page, { title = '', url = '' } = {}) {
    if (!page) return false;
    if (typeof page.isClosed === 'function' && page.isClosed()) return false;

    const safeUrl = String(url || '').trim();
    const safeTitle = String(title || '').trim();
    const lowerUrl = safeUrl.toLowerCase();

    if (lowerUrl.startsWith('devtools://')) return false;
    if (lowerUrl.startsWith('chrome-extension://')) return false;
    if (lowerUrl.startsWith('extension://')) return false;
    if (!safeUrl && !safeTitle) return false;

    return true;
}

async function getVisiblePagesDetailed() {
    const pages = getPagesInternal();
    const visiblePages = [];
    const seenPlaceholderKeys = new Set();

    for (const page of pages) {
        let title = '';
        let url = '';
        try {
            title = await page.title().catch(() => '');
            url = page.url();
        } catch {
            // ignore
        }

        if (!isUserVisiblePage(page, { title, url })) {
            continue;
        }

        const normalizedUrl = String(url || '').trim().toLowerCase();
        const normalizedTitle = String(title || '').trim().toLowerCase();
        const isInternalNewTabLike =
            normalizedUrl === 'about:blank' ||
            normalizedUrl === 'chrome://newtab/' ||
            normalizedUrl === 'chrome://new-tab-page/' ||
            normalizedUrl === 'chrome-search://local-ntp/local-ntp.html' ||
            normalizedUrl === 'edge://newtab/';
        const isPlaceholderPage =
            isInternalNewTabLike ||
            (!normalizedTitle && !normalizedUrl);

        // 对同一个新标签内部链路产生的重复占位页做去重，只保留一个实例
        if (isPlaceholderPage) {
            const key = isInternalNewTabLike ? '__internal_new_tab__' : '__blank_placeholder__';
            if (seenPlaceholderKeys.has(key)) {
                continue;
            }
            seenPlaceholderKeys.add(key);
        }

        let focusState = {
            hasFocus: false,
            visibilityState: 'unknown',
            lastFocusAt: 0,
            lastBlurAt: 0,
            lastVisibleAt: 0,
            updatedAt: 0
        };
        try {
            focusState = await page.evaluate((trackerScript) => {
                try {
                    globalThis.eval(trackerScript);
                } catch {
                    // ignore
                }

                const tracker = globalThis.__yisheFocusTracker || {};
                return {
                    hasFocus: typeof document?.hasFocus === 'function' ? document.hasFocus() : false,
                    visibilityState: document?.visibilityState || 'unknown',
                    lastFocusAt: Number(tracker.lastFocusAt || 0),
                    lastBlurAt: Number(tracker.lastBlurAt || 0),
                    lastVisibleAt: Number(tracker.lastVisibleAt || 0),
                    updatedAt: Number(tracker.updatedAt || 0)
                };
            }, FOCUS_TRACKER_SCRIPT);
        } catch {
            // ignore page state probing failures during navigation
        }

        visiblePages.push({
            page,
            title,
            url,
            hasFocus: !!focusState?.hasFocus,
            visibilityState: String(focusState?.visibilityState || 'unknown'),
            lastFocusAt: Number(focusState?.lastFocusAt || 0),
            lastBlurAt: Number(focusState?.lastBlurAt || 0),
            lastVisibleAt: Number(focusState?.lastVisibleAt || 0),
            updatedAt: Number(focusState?.updatedAt || 0)
        });
    }

    const focusedCandidate = visiblePages
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.hasFocus || item.lastFocusAt > 0)
        .sort((a, b) => {
            if (Number(b.item.hasFocus) !== Number(a.item.hasFocus)) {
                return Number(b.item.hasFocus) - Number(a.item.hasFocus);
            }
            return (b.item.lastFocusAt || 0) - (a.item.lastFocusAt || 0);
        })[0];

    const visibleCandidate = visiblePages
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.visibilityState === 'visible' || item.lastVisibleAt > 0)
        .sort((a, b) => {
            if ((b.item.visibilityState === 'visible') !== (a.item.visibilityState === 'visible')) {
                return Number(b.item.visibilityState === 'visible') - Number(a.item.visibilityState === 'visible');
            }
            return (b.item.lastVisibleAt || 0) - (a.item.lastVisibleAt || 0);
        })[0];

    const focusedIndex = focusedCandidate ? focusedCandidate.index : -1;
    const visibleIndex = visibleCandidate ? visibleCandidate.index : -1;

    return visiblePages.map((item, index) => ({
        index,
        page: item.page,
        title: item.title,
        url: item.url,
        hasFocus: item.hasFocus,
        visibilityState: item.visibilityState,
        isFocusedTab: focusedIndex >= 0 ? index === focusedIndex : false,
        isVisibleTab: visibleIndex >= 0 ? index === visibleIndex : false
    }));
}

export async function listBrowserPages(options = {}) {
    if (shouldUseManagedProfilePool(options)) {
        return await listManagedProfileBrowserPages(options?.profileId);
    }

    const pages = await getVisiblePagesDetailed();
    return pages.map(({ index, title, url, hasFocus, visibilityState, isFocusedTab, isVisibleTab }) => ({
        index,
        title,
        url,
        hasFocus,
        visibilityState,
        isFocusedTab,
        isVisibleTab
    }));
}

export async function getBrowserPage(pageIndex, options = {}) {
    if (shouldUseManagedProfilePool(options)) {
        return await getManagedProfileBrowserPage(options?.profileId, pageIndex);
    }

    const pages = await getVisiblePagesDetailed();
    if (!pages.length) {
        return await newPageWithReconnect(currentBrowserOptions);
    }

    const index = Number.isInteger(pageIndex) ? pageIndex : 0;
    if (index < 0 || index >= pages.length) {
        throw new Error(`页面索引无效: ${pageIndex}`);
    }
    return pages[index].page;
}

export async function createBrowserPage(options = {}) {
    if (shouldUseManagedProfilePool(options)) {
        return await createProfileBrowserPage(options?.profileId);
    }

    return await newPageWithReconnect(currentBrowserOptions);
}

/**
 * 更新浏览器活动状态
 */
export function updateBrowserActivity(options = {}) {
    if (shouldUseManagedProfilePool(options)) {
        return updateManagedProfileBrowserActivity(options?.profileId);
    }

    browserStatus.lastActivity = Date.now();
    try {
        const pages = getPagesInternal().filter(page => {
            try {
                return page && !(typeof page.isClosed === 'function' && page.isClosed());
            } catch {
                return false;
            }
        });
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
export async function closeBrowser(options = {}) {
    if (shouldUseManagedProfilePool(options)) {
        await closeManagedProfileBrowser(options?.profileId);
        return;
    }

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
        currentProfileDir = null;
        currentExecutablePath = null;
        currentCdpEndpoint = null;
        currentManagedProfileId = null;
        currentBrowserVersion = null;
    } catch (error) {
        logger.error('清理浏览器资源时出错:', error);
    }
}

export async function focusBrowser(options = {}) {
    if (shouldUseManagedProfilePool(options)) {
        return await focusManagedProfileBrowser(options?.profileId);
    }

    throw new Error('当前浏览器模式暂不支持聚焦窗口');
}

/**
 * 强制关闭指定调试端口的浏览器实例（默认 9222）
 */
export async function forceCloseBrowserByPort({ port = 9222 } = {}) {
    const safePort = Number(port) || 9222;
    await closeBrowser();

    try {
        const pids = await getListeningPids(safePort);
        if (!pids.length) {
            return { ok: true, port: safePort, message: '未发现占用端口的进程', pids: [], killed: [] };
        }
        const { killed, errors } = await killPids(pids);
        const ok = killed.length > 0 && errors.length === 0;
        return { ok, port: safePort, pids, killed, errors };
    } catch (e) {
        return { ok: false, port: safePort, error: e.message || String(e) };
    }
}

/**
 * 清除用户数据
 */
export async function clearUserData() {
    if (shouldUseManagedProfilePool()) {
        const profile = getActiveBrowserProfile() || ensureDefaultBrowserProfile();
        const userDataDir = profile?.userDataDir;
        if (!userDataDir) {
            throw new Error('未找到可清理的受管环境目录');
        }

        await closeManagedProfileBrowser(profile.id);
        fs.emptyDirSync(userDataDir);
        logger.info(`已清空用户数据目录: ${userDataDir}`);
        return { success: true, userDataDir };
    }

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
        currentManagedProfileId = null;

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
 * 导出用户数据为 ZIP 压缩包
 * @param {string} userDataDir 用户数据目录路径
 * @returns {Promise<Buffer>} ZIP 文件 Buffer
 */
export async function exportUserData(userDataDir) {
    try {
        if (!userDataDir || !fs.existsSync(userDataDir)) {
            throw new Error(`User Data 目录不存在: ${userDataDir}`);
        }

        // 确保浏览器已关闭
        logger.info('正在关闭浏览器以准备导出数据...');
        await closeBrowser();

        logger.info(`正在压缩用户数据目录: ${userDataDir} ...`);
        const zip = new AdmZip();

        // 我们递归添加目录内容
        // 注意：全量导出。虽然体积大，但最稳。
        zip.addLocalFolder(userDataDir);

        const buffer = zip.toBuffer();
        logger.info(`用户数据压缩完成，大小: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        return buffer;
    } catch (error) {
        logger.error('导出用户数据失败:', error);
        throw error;
    }
}

/**
 * 从 ZIP 压缩包导入用户数据
 * @param {string} zipPath ZIP 文件路径
 * @param {string} userDataDir 目标用户数据目录
 */
export async function importUserData(zipPath, userDataDir) {
    try {
        if (!fs.existsSync(zipPath)) {
            throw new Error(`待导入的 ZIP 文件不存在: ${zipPath}`);
        }

        // 验证 ZIP 文件大小
        const fileStats = fs.statSync(zipPath);
        logger.info(`ZIP 文件大小: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

        if (fileStats.size < 100) {
            throw new Error(`ZIP 文件过小 (${fileStats.size} 字节)，可能不是有效的 ZIP 文件或文件损坏`);
        }

        if (fileStats.size > 10 * 1024 * 1024 * 1024) {
            throw new Error(`ZIP 文件过大 (${(fileStats.size / 1024 / 1024 / 1024).toFixed(2)} GB)，超过 10GB 限制`);
        }

        // 检查磁盘空间（预估需要 3 倍 ZIP 大小的临时空间）
        const requiredSpace = fileStats.size * 3;
        const targetDir = path.dirname(userDataDir);
        try {
            if (process.platform !== 'win32') {
                const util = require('util');
                const statfs = util.promisify(fs.statfs);
                const stats = await statfs(targetDir);
                const freeSpace = stats.bavail * stats.bsize;
                if (freeSpace < requiredSpace) {
                    throw new Error(
                        `磁盘空间不足。需要: ${(requiredSpace / 1024 / 1024 / 1024).toFixed(2)} GB, ` +
                        `可用: ${(freeSpace / 1024 / 1024 / 1024).toFixed(2)} GB`
                    );
                }
            }
        } catch (diskErr) {
            if (!diskErr.message.includes('磁盘空间不足')) {
                logger.warn(`磁盘空间检查失败: ${diskErr.message}（继续尝试导入）`);
            } else {
                throw diskErr;
            }
        }

        // 验证 ZIP 格式完整性
        let zipInstance;
        try {
            zipInstance = new AdmZip(zipPath);
            const entries = zipInstance.getEntries();
            if (!entries || entries.length === 0) {
                throw new Error('ZIP 文件为空或格式无效');
            }
            logger.info(`ZIP 文件包含 ${entries.length} 个条目`);
        } catch (zipErr) {
            const errMsg = zipErr.message || String(zipErr);
            if (errMsg.includes('Invalid') || errMsg.includes('No END header')) {
                throw new Error(`ZIP 文件格式错误或已损坏: ${errMsg}。请确保上传的文件是完整的有效 ZIP 文件。`);
            }
            throw zipErr;
        }

        // 确保浏览器已关闭
        logger.info('正在关闭浏览器以准备导入数据...');
        await closeBrowser();

        // 清理目标目录
        if (fs.existsSync(userDataDir)) {
            logger.info(`正在清理旧的目标目录: ${userDataDir}`);
            fs.removeSync(userDataDir);
        }

        fs.ensureDirSync(userDataDir);

        logger.info(`正在从 ${zipPath} 导入用户数据到 ${userDataDir} ...`);
        try {
            zipInstance.extractAllTo(userDataDir, true);
        } catch (extractErr) {
            // 捕获解压过程中的错误
            if (extractErr.code === 'ENOSPC' || extractErr.message.includes('空间')) {
                throw new Error(`解压失败: 磁盘空间不足。请检查目标路径的可用空间。`);
            }
            throw new Error(`解压 ZIP 文件失败: ${extractErr.message}`);
        }

        logger.info('用户数据导入完成');
        return true;
    } catch (error) {
        logger.error('导入用户数据失败:', error);
        throw error;
    }
}

export function listManagedBrowserProfiles() {
    return listBrowserProfiles();
}

export function getManagedBrowserProfile(profileId) {
    return getBrowserProfile(profileId);
}

export function createManagedBrowserProfile(payload = {}) {
    return createBrowserProfile(payload);
}

export function updateManagedBrowserProfile(profileId, payload = {}) {
    return updateBrowserProfile(profileId, payload);
}

export function deleteManagedBrowserProfile(profileId) {
    if (hasManagedProfileBrowser(profileId)) {
        throw new Error('当前环境正在使用中，请先关闭浏览器后再删除');
    }
    return deleteBrowserProfile(profileId);
}

export function switchManagedBrowserProfile(profileId) {
    return switchBrowserProfile(profileId);
}

/**
 * 清理资源
 */
export async function cleanup() {
    await closeManagedProfileBrowser();
    await closeBrowser({ mode: 'persistent' });
}

// 导出默认的浏览器服务类
export class BrowserService {
    static async getOrCreateBrowser(options = {}) {
        return getOrCreateBrowser(options);
    }

    static async close(options = {}) {
        return closeBrowser(options);
    }

    static async clearUserData() {
        return clearUserData();
    }

    static async getStatus(options = {}) {
        return await getBrowserStatus(options);
    }

    static async cleanup() {
        return cleanup();
    }

    static async isBrowserAvailable(options = {}) {
        return isBrowserAvailable(options);
    }

    static async detectExistingBrowser() {
        return detectExistingBrowser();
    }

    static launchWithDebugPort(options = {}) {
        return launchWithDebugPort(options);
    }

    static updateActivity(options = {}) {
        return updateBrowserActivity(options);
    }

    static keepOpen() {
        return keepBrowserOpen();
    }

    static async exportUserData(userDataDir) {
        return exportUserData(userDataDir);
    }

    static async importUserData(zipPath, userDataDir) {
        return importUserData(zipPath, userDataDir);
    }

    static async forceCloseByPort(options = {}) {
        return forceCloseBrowserByPort(options);
    }

    static listProfiles() {
        return listBrowserProfiles();
    }

    static getProfile(profileId) {
        return getBrowserProfile(profileId);
    }

    static createProfile(payload = {}) {
        return createBrowserProfile(payload);
    }

    static updateProfile(profileId, payload = {}) {
        return updateBrowserProfile(profileId, payload);
    }

    static deleteProfile(profileId) {
        if (hasManagedProfileBrowser(profileId)) {
            throw new Error('当前环境正在使用中，请先关闭浏览器后再删除');
        }
        return deleteBrowserProfile(profileId);
    }

    static switchProfile(profileId) {
        return switchBrowserProfile(profileId);
    }

    static async focus(options = {}) {
        return focusBrowser(options);
    }

    static async listPages(options = {}) {
        return listBrowserPages(options);
    }

    static async getPage(pageIndex, options = {}) {
        return getBrowserPage(pageIndex, options);
    }

    static async createPage(options = {}) {
        return createBrowserPage(options);
    }
}
