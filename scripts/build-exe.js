/**
 * 构建可执行文件，并生成可直接用于制作安装包的发布目录
 *
 * 发布目录会包含：
 * - 可执行文件
 * - web/dist
 * - node_modules/playwright
 * - node_modules/playwright-core
 * - pw-browsers（随包 Chromium）
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempDir = path.join(rootDir, 'temp');
const bundlePath = path.join(tempDir, 'server-bundle.cjs');
const nexeCacheDir = path.join(tempDir, 'nexe-cache');
const releaseRootDir = path.join(rootDir, 'release');
const nodeVersion = '20.18.3';
const remote = 'https://github.com/urbdyn/nexe_builds/releases/download/0.4.0/';
const prebuiltMacAssetUrl = `${remote}mac-arm64-${nodeVersion}-tmp.3`;
const webDistResourceGlob = 'web/dist/**/*';

const platform = process.platform;
const isWin = platform === 'win32';
const isMac = platform === 'darwin';
const arch = process.arch;
const outputName = isWin ? 'yishe-uploader.exe' : 'yishe-uploader';
const exePath = path.join(rootDir, outputName);
const releaseDirName = isWin ? 'windows-x64' : isMac ? `mac-${arch}` : `${platform}-${arch}`;
const releaseDir = path.join(releaseRootDir, releaseDirName);
const releaseExecutablePath = path.join(releaseDir, outputName);
const releaseBrowsersDir = path.join(releaseDir, 'pw-browsers');
const releaseNodeModulesDir = path.join(releaseDir, 'node_modules');
const releaseWebDistDir = path.join(releaseDir, 'web', 'dist');
const playwrightPackageDir = path.join(rootDir, 'node_modules', 'playwright');
const playwrightCorePackageDir = path.join(rootDir, 'node_modules', 'playwright-core');
const playwrightCliPath = path.join(rootDir, 'node_modules', '.bin', isWin ? 'playwright.cmd' : 'playwright');
const nexeCmd = path.join(rootDir, 'node_modules', '.bin', isWin ? 'nexe.cmd' : 'nexe');
const forceBuild = ['1', 'true', 'yes'].includes(
    String(process.env.YISHE_NEXE_FORCE_BUILD || '').toLowerCase()
);

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    ensureDir(dirPath);
}

function assertExists(targetPath, label) {
    if (!fs.existsSync(targetPath)) {
        throw new Error(`${label} 不存在: ${targetPath}`);
    }
}

function copyDir(sourceDir, targetDir) {
    ensureDir(path.dirname(targetDir));
    fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

function copyFile(sourceFile, targetFile) {
    ensureDir(path.dirname(targetFile));
    fs.copyFileSync(sourceFile, targetFile);
}

async function ensurePrebuiltNexeAsset(url) {
    ensureDir(nexeCacheDir);

    const assetPath = path.join(nexeCacheDir, path.basename(url));
    if (fs.existsSync(assetPath) && fs.statSync(assetPath).size > 0) {
        console.log(`✅ 已复用本地缓存的 nexe 基座: ${assetPath}`);
        return assetPath;
    }

    console.log(`⬇️ 下载 nexe 预编译基座: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`下载失败 (${response.status} ${response.statusText})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(assetPath, buffer);
    console.log(`✅ nexe 基座下载完成: ${assetPath}`);
    return assetPath;
}

async function buildBackendBundle() {
    ensureDir(tempDir);

    await build({
        entryPoints: [path.join(rootDir, 'src/api/server.js')],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        outfile: bundlePath,
        external: [
            'playwright',
            'playwright-core',
        ],
        banner: {
            js: `
// import.meta shim for CommonJS
const __import_meta_url = require('url').pathToFileURL(__filename).href;

// Nexe 资源路径补丁
const __nexe_patches = {
    originalResolve: require('path').resolve,
    isNexe: typeof process.__nexe !== 'undefined'
};

if (__nexe_patches.isNexe) {
    const path = require('path');

    global.__dirname = path.dirname(process.execPath);

    if (!process.env.FRONTEND_DIST) {
        process.env.FRONTEND_DIST = path.join(path.dirname(process.execPath), 'web', 'dist');
    }
}
`
        },
        define: {
            'import.meta.url': '__import_meta_url',
        },
        minify: false,
    });
}

async function buildExecutable() {
    const target = isWin ? `windows-x64-${nodeVersion}` : `mac-${arch}-${nodeVersion}`;
    let useRemote = isWin;
    let useBuild = !isWin;
    let assetPath = '';

    if (isMac) {
        console.log(`💻 检测到 macOS 架构: ${arch}`);
        if (!forceBuild && arch === 'arm64') {
            try {
                assetPath = await ensurePrebuiltNexeAsset(prebuiltMacAssetUrl);
                useBuild = false;
            } catch (downloadError) {
                console.warn(`⚠️ 下载 macOS 预编译基座失败，回退到本地源码构建: ${downloadError.message}`);
            }
        }
    }

    if (forceBuild) {
        useRemote = false;
        useBuild = true;
        assetPath = '';
        console.log('⚙️ 检测到 YISHE_NEXE_FORCE_BUILD，强制使用本地源码构建');
    }

    if (fs.existsSync(exePath)) {
        try {
            fs.unlinkSync(exePath);
            console.log('✅ 已清理旧的可执行文件');
        } catch (error) {
            throw new Error(`无法删除旧的可执行文件: ${error.message}`);
        }
    }

    assertExists(nexeCmd, 'nexe 可执行文件');
    assertExists(bundlePath, '后端 bundle');

    const relativeBundlePath = path.relative(rootDir, bundlePath);
    const nexeArgs = [
        '-i', `"${relativeBundlePath}"`,
        '-t', target,
        '-o', `"${exePath}"`,
        '--verbose',
        '--exclude', 'src/**',
        '--exclude', 'web/**',
        '--exclude', 'scripts/**',
        '--exclude', 'docs/**',
        '--resource', `"${webDistResourceGlob}"`,
    ];

    if (useRemote) {
        nexeArgs.push('--remote', `"${remote}"`);
    }

    if (assetPath) {
        nexeArgs.push('--asset', `"${path.relative(rootDir, assetPath)}"`);
    }

    if (useBuild) {
        nexeArgs.push('--build');
    }

    const nexeArgsString = nexeArgs.join(' ');

    console.log(`执行命令: ${nexeCmd} ${nexeArgsString}\n`);
    console.log(`目标版本: ${target}`);
    console.log(`构建策略: ${assetPath ? '本地预下载预编译基座' : useRemote ? '远端预编译' : '本地源码构建'}`);
    if (useRemote) {
        console.log(`使用远程源: ${remote}`);
    }
    if (assetPath) {
        console.log(`使用本地基座: ${assetPath}`);
    }
    if (useBuild) {
        console.log('⚠️ macOS 将使用 --build，本地编译时间会更长');
    }
    console.log('');

    execSync(`"${nexeCmd}" ${nexeArgsString}`, { stdio: 'inherit', cwd: rootDir });
}

function stagePlaywrightRuntime() {
    assertExists(playwrightPackageDir, 'playwright 运行时目录');
    assertExists(playwrightCorePackageDir, 'playwright-core 运行时目录');
    assertExists(playwrightCliPath, 'playwright CLI');

    copyDir(playwrightPackageDir, path.join(releaseNodeModulesDir, 'playwright'));
    copyDir(playwrightCorePackageDir, path.join(releaseNodeModulesDir, 'playwright-core'));
}

function installBundledChromium() {
    ensureDir(releaseBrowsersDir);
    console.log(`⬇️ 安装 Playwright Chromium 到随包目录: ${releaseBrowsersDir}`);

    execSync(`"${playwrightCliPath}" install chromium`, {
        cwd: rootDir,
        stdio: 'inherit',
        env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: releaseBrowsersDir,
        },
    });
}

function stageReleaseBundle() {
    assertExists(exePath, '可执行文件');
    assertExists(path.join(rootDir, 'web', 'dist'), '前端构建目录');

    cleanDir(releaseDir);

    copyFile(exePath, releaseExecutablePath);
    if (!isWin) {
        fs.chmodSync(releaseExecutablePath, 0o755);
    }

    copyDir(path.join(rootDir, 'web', 'dist'), releaseWebDistDir);
    stagePlaywrightRuntime();
    installBundledChromium();
}

console.log(`🚀 开始构建 ${isWin ? 'Windows EXE' : isMac ? 'macOS' : '通用'} 可执行文件与发布目录...\n`);

console.log('📦 步骤 1/4: 构建前端...');
try {
    execSync('npm run web:build', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ 前端构建完成\n');
} catch (error) {
    console.error('❌ 前端构建失败:', error.message);
    process.exit(1);
}

console.log('📦 步骤 2/4: 打包后端代码...');
try {
    await buildBackendBundle();
    console.log('✅ 后端代码打包完成\n');
} catch (error) {
    console.error('❌ 后端打包失败:', error.message);
    process.exit(1);
}

console.log(`📦 步骤 3/4: 使用 nexe 生成 ${isWin ? 'EXE' : '可执行文件'}...`);
try {
    await buildExecutable();
    console.log(`\n✅ ${isWin ? 'EXE' : '可执行文件'} 构建完成!`);
    console.log(`📍 根目录产物: ${exePath}\n`);
} catch (error) {
    console.error('❌ Nexe 打包失败:', error.message);
    process.exit(1);
}

console.log('📦 步骤 4/4: 组装 installer 发布目录...');
try {
    stageReleaseBundle();
    console.log('✅ 发布目录组装完成\n');
} catch (error) {
    console.error('❌ 发布目录组装失败:', error.message);
    process.exit(1);
}

console.log('🎉 构建流程全部完成!');
console.log(`📍 发布目录: ${releaseDir}`);
console.log(`📍 发布浏览器目录: ${releaseBrowsersDir}`);
console.log('\n⚠️ 发布说明:');
console.log('   1. 给用户分发或制作安装包时，请使用 release 目录中的完整内容，而不是单独的 exe');
console.log('   2. 目标机器不需要再手动执行 playwright install');
console.log('   3. Windows 包请在 Windows 构建，macOS 包请在 macOS 构建，因为随包 Chromium 是平台相关的');
