import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { chromium as coreChromium } from 'playwright-core';
import playwrightExtraPkg from 'playwright-extra/dist/extra.js';
import chromeAppEvasion from 'puppeteer-extra-plugin-stealth/evasions/chrome.app/index.js';
import chromeCsiEvasion from 'puppeteer-extra-plugin-stealth/evasions/chrome.csi/index.js';
import chromeLoadTimesEvasion from 'puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes/index.js';
import chromeRuntimeEvasion from 'puppeteer-extra-plugin-stealth/evasions/chrome.runtime/index.js';
import defaultArgsEvasion from 'puppeteer-extra-plugin-stealth/evasions/defaultArgs/index.js';
import iframeContentWindowEvasion from 'puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js';
import mediaCodecsEvasion from 'puppeteer-extra-plugin-stealth/evasions/media.codecs/index.js';
import navigatorHardwareConcurrencyEvasion from 'puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency/index.js';
import navigatorLanguagesEvasion from 'puppeteer-extra-plugin-stealth/evasions/navigator.languages/index.js';
import navigatorPermissionsEvasion from 'puppeteer-extra-plugin-stealth/evasions/navigator.permissions/index.js';
import navigatorPluginsEvasion from 'puppeteer-extra-plugin-stealth/evasions/navigator.plugins/index.js';
import navigatorWebdriverEvasion from 'puppeteer-extra-plugin-stealth/evasions/navigator.webdriver/index.js';
import sourceUrlEvasion from 'puppeteer-extra-plugin-stealth/evasions/sourceurl/index.js';
import webglVendorEvasion from 'puppeteer-extra-plugin-stealth/evasions/webgl.vendor/index.js';
import windowOuterDimensionsEvasion from 'puppeteer-extra-plugin-stealth/evasions/window.outerdimensions/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { PlaywrightExtra } = playwrightExtraPkg;
const stealthEvasionFactories = [
    chromeAppEvasion,
    chromeCsiEvasion,
    chromeLoadTimesEvasion,
    chromeRuntimeEvasion,
    defaultArgsEvasion,
    iframeContentWindowEvasion,
    mediaCodecsEvasion,
    navigatorHardwareConcurrencyEvasion,
    navigatorLanguagesEvasion,
    navigatorPermissionsEvasion,
    navigatorPluginsEvasion,
    navigatorWebdriverEvasion,
    sourceUrlEvasion,
    webglVendorEvasion,
    windowOuterDimensionsEvasion,
];

function normalizeDir(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return null;
    }

    return path.resolve(normalized);
}

let playwrightImportPromise = null;
let stealthConfigured = false;
// 避开 playwright-extra 包根入口，避免打进 nexe 单文件后触发默认 loader 自加载失败。
const extraChromium = new PlaywrightExtra(coreChromium);

export function isPackagedRuntime() {
    return typeof process.__nexe !== 'undefined';
}

export function getAppDir() {
    const explicitDir = normalizeDir(process.env.YISHE_APP_ROOT_DIR || process.env.UPLOADER_APP_ROOT_DIR);
    if (explicitDir) {
        return explicitDir;
    }

    if (isPackagedRuntime()) {
        return path.dirname(process.execPath);
    }

    return path.resolve(__dirname, '../..');
}

export function initBundledPlaywrightEnv() {
    return {
        browsersPath: null,
        exists: false,
        source: 'local-chrome',
        usingBundledPath: false,
    };
}

function existsAny(paths = []) {
    for (const candidate of paths) {
        try {
            if (candidate && existsSync(candidate)) {
                return candidate;
            }
        } catch {
            // ignore
        }
    }

    return null;
}

export function getDefaultChromeExecutablePath() {
    if (process.platform === 'win32') {
        const pf = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        const pf64 = process.env.ProgramFiles || 'C:\\Program Files';
        return existsAny([
            path.join(pf64, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ]) || path.join(pf64, 'Google', 'Chrome', 'Application', 'chrome.exe');
    }

    if (process.platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    return '/usr/bin/google-chrome';
}

export async function getPlaywrightChromium() {
    initBundledPlaywrightEnv();

    if (!playwrightImportPromise) {
        playwrightImportPromise = Promise.resolve().then(() => {
            if (!stealthConfigured) {
                for (const createEvasionPlugin of stealthEvasionFactories) {
                    extraChromium.use(createEvasionPlugin());
                }
                stealthConfigured = true;
            }

            return extraChromium;
        });
    }

    const playwrightModule = await playwrightImportPromise;
    const chromium = playwrightModule?.launchPersistentContext
        ? playwrightModule
        : playwrightModule.chromium || playwrightModule.default?.chromium;

    if (!chromium) {
        throw new Error('无法从 playwright-extra 模块中解析 chromium');
    }

    return chromium;
}
