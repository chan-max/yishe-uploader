import path from 'path';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeDir(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return null;
    }

    return path.resolve(normalized);
}

function hasPlaywrightBrowserPayload(dirPath) {
    if (!dirPath || !existsSync(dirPath)) {
        return false;
    }

    try {
        return readdirSync(dirPath).some((entry) => entry !== '.DS_Store');
    } catch {
        return false;
    }
}

let playwrightImportPromise = null;

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

export function getBundledPlaywrightBrowsersDir() {
    const explicitDir = normalizeDir(
        process.env.YISHE_PLAYWRIGHT_BROWSERS_DIR || process.env.UPLOADER_PLAYWRIGHT_BROWSERS_DIR
    );
    if (explicitDir) {
        return explicitDir;
    }

    return path.join(getAppDir(), 'pw-browsers');
}

export function initBundledPlaywrightEnv() {
    const explicitBrowsersPath = normalizeDir(process.env.PLAYWRIGHT_BROWSERS_PATH);
    if (explicitBrowsersPath) {
        process.env.PLAYWRIGHT_BROWSERS_PATH = explicitBrowsersPath;
        return {
            browsersPath: explicitBrowsersPath,
            exists: hasPlaywrightBrowserPayload(explicitBrowsersPath),
            source: 'env',
            usingBundledPath: false,
        };
    }

    const bundledBrowsersPath = getBundledPlaywrightBrowsersDir();
    const hasBundledBrowsers = hasPlaywrightBrowserPayload(bundledBrowsersPath);

    if (hasBundledBrowsers || isPackagedRuntime()) {
        process.env.PLAYWRIGHT_BROWSERS_PATH = bundledBrowsersPath;
        return {
            browsersPath: bundledBrowsersPath,
            exists: hasBundledBrowsers,
            source: hasBundledBrowsers ? 'bundled' : 'expected-bundled',
            usingBundledPath: true,
        };
    }

    return {
        browsersPath: null,
        exists: false,
        source: 'default-cache',
        usingBundledPath: false,
    };
}

export async function getPlaywrightChromium() {
    initBundledPlaywrightEnv();

    if (!playwrightImportPromise) {
        playwrightImportPromise = import('playwright');
    }

    const playwrightModule = await playwrightImportPromise;
    const chromium = playwrightModule.chromium || playwrightModule.default?.chromium;

    if (!chromium) {
        throw new Error('无法从 playwright 模块中解析 chromium');
    }

    return chromium;
}
