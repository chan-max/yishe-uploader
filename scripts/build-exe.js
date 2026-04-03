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

// 检测当前平台并设置构建参数
const platform = process.platform;
const isWin = platform === 'win32';
const isMac = platform === 'darwin';

// 设置输出路径和名称
const outputName = isWin ? 'yishe-uploader.exe' : 'yishe-uploader';
const exePath = path.join(rootDir, outputName);

console.log(`🚀 开始构建 ${isWin ? 'Windows EXE' : isMac ? 'macOS' : '通用'} 可执行文件...\n`);

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

    const remote = 'https://github.com/urbdyn/nexe_builds/releases/download/0.4.0/';

    // 根据平台和架构选择 target
    const arch = process.arch; // e.g., 'x64' or 'arm64'
    let target = isWin ? `windows-x64-20.18.3` : `macos-${arch}-20.18.3`;

    // Windows 继续使用远端预编译；macOS 改为本地编译，避免 remote 缺少 arm64 构建产物。
    const useRemote = isWin;
    const useBuild = !useRemote;

    if (isMac) {
        console.log(`💻 检测到 macOS 架构: ${arch}`);
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
        '--resource', `"${path.join(rootDir, 'web/dist/**/*')}"`,
    ];

    if (useRemote) {
        nexeArgs.push('--remote', `"${remote}"`);
    }

    if (useBuild) {
        nexeArgs.push('--build');
    }

    const nexeArgsString = nexeArgs.join(' ');

    console.log(`执行命令: ${nexeCmd} ${nexeArgsString}\n`);
    console.log(`目标版本: ${target}`);
    console.log(`构建策略: ${useRemote ? '远端预编译' : '本地源码构建'}`);
    if (useRemote) {
        console.log(`使用远程源: ${remote}`);
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
