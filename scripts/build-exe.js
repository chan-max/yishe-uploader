/**
 * 构建 可执行文件 (EXE/Binary)
 * 使用 esbuild 打包后端代码，然后用 nexe 生成单一可执行文件
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
const nodeVersion = '20.18.3';
const remote = 'https://github.com/urbdyn/nexe_builds/releases/download/0.4.0/';
const prebuiltMacAssetUrl = `${remote}mac-arm64-${nodeVersion}-tmp.3`;
const webDistResourceGlob = 'web/dist/**/*';

// 检测当前平台并设置构建参数
const platform = process.platform;
const isWin = platform === 'win32';
const isMac = platform === 'darwin';

// 设置输出路径和名称
const outputName = isWin ? 'yishe-uploader.exe' : 'yishe-uploader';
const exePath = path.join(rootDir, outputName);
const forceBuild = ['1', 'true', 'yes'].includes(
    String(process.env.YISHE_NEXE_FORCE_BUILD || '').toLowerCase()
);

console.log(`🚀 开始构建 ${isWin ? 'Windows EXE' : isMac ? 'macOS' : '通用'} 可执行文件...\n`);

async function ensurePrebuiltNexeAsset(url) {
    if (!fs.existsSync(nexeCacheDir)) {
        fs.mkdirSync(nexeCacheDir, { recursive: true });
    }

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

// 步骤 1: 构建前端
console.log('📦 步骤 1/3: 构建前端...');
try {
    execSync('npm run web:build', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ 前端构建完成\n');
} catch (error) {
    console.error('❌ 前端构建失败:', error.message);
    process.exit(1);
}

// 步骤 2: 使用 esbuild 打包后端代码
console.log('📦 步骤 2/3: 打包后端代码...');
try {
    // 确保 temp 目录存在
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

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
    const originalDirname = path.dirname;
    
    // 重写 __dirname 使其指向 exe 所在目录
    global.__dirname = path.dirname(process.execPath);
    
    // 确保 web/dist 路径正确
    const originalEnv = process.env.FRONTEND_DIST;
    if (!originalEnv) {
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

    console.log('✅ 后端代码打包完成\n');
} catch (error) {
    console.error('❌ 后端打包失败:', error.message);
    process.exit(1);
}

// 步骤 3: 使用 nexe 生成可执行文件
console.log(`📦 步骤 3/3: 使用 nexe 生成 ${isWin ? 'EXE' : '可执行文件'}...`);
try {
    // 使用本地安装的 nexe
    const nexeBin = isWin ? 'nexe.cmd' : 'nexe';
    const nexeCmd = path.join(rootDir, 'node_modules', '.bin', nexeBin);

    // 根据平台和架构选择 target
    const arch = process.arch; // e.g., 'x64' or 'arm64'
    let target = isWin ? `windows-x64-${nodeVersion}` : `mac-${arch}-${nodeVersion}`;
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

    // 检查并删除已存在的输出文件
    if (fs.existsSync(exePath)) {
        try {
            fs.unlinkSync(exePath);
            console.log('✅ 已清理旧的可执行文件');
        } catch (e) {
            console.error(`\n❌ 无法删除旧的文件: ${e.message}`);
            process.exit(1);
        }
    }

    // 计算相对路径
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
        const relativeAssetPath = path.relative(rootDir, assetPath);
        nexeArgs.push('--asset', `"${relativeAssetPath}"`);
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

    console.log(`\n✅ ${isWin ? 'EXE' : '可执行文件'} 构建完成!`);
    console.log(`📍 输出路径: ${exePath}`);
    console.log('\n⚠️  注意事项:');
    console.log('   1. 生成的程序需要与 node_modules 目录在同一位置（playwright 依赖）');
    console.log('   2. 首次运行可能需要安装 playwright 浏览器: npx playwright install');
    console.log('   3. 确保 web/dist 目录与程序在同一父目录下');
    console.log('\n🎉 构建流程全部完成!');
} catch (error) {
    console.error('❌ Nexe 打包失败:', error.message);
    process.exit(1);
}
