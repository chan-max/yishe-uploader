/**
 * 构建 EXE 可执行文件
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
const exePath = path.join(rootDir, 'yishe-auto-browser.exe');

console.log('🚀 开始构建 EXE 可执行文件...\n');

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

// 步骤 3: 使用 nexe 生成 exe
console.log('📦 步骤 3/3: 使用 nexe 生成 EXE...');
try {
    // 使用本地安装的 nexe (直接调用 .cmd 文件以兼容 Windows，兼容 CI/CD)
    const isWin = process.platform === 'win32';
    const nexeExe = isWin ? 'nexe.cmd' : 'nexe';
    const nexeCmd = path.join(rootDir, 'node_modules', '.bin', nexeExe);

    const remote = 'https://github.com/urbdyn/nexe_builds/releases/download/0.4.0/';
    const target = 'windows-x64-20.18.3';

    // 检查并删除已存在的 EXE，避免 EBUSY 错误
    if (fs.existsSync(exePath)) {
        try {
            fs.unlinkSync(exePath);
            console.log('✅ 已清理旧的 EXE 文件');
        } catch (e) {
            console.error('\n❌ 无法删除旧的 EXE 文件，可能正在运行中。请先关闭 yishe-auto-browser.exe！');
            console.error(`错误详情: ${e.message}`);
            process.exit(1);
        }
    }

    // 计算相对路径，避免绝对路径可能导致的问题
    const relativeBundlePath = path.relative(rootDir, bundlePath);

    const nexeArgs = [
        '-i', `"${relativeBundlePath}"`, // 显式指定输入文件
        '-t', target,
        '--remote', `"${remote}"`,
        '-o', `"${exePath}"`,
        '--verbose',
        '--exclude', 'src/**',
        '--exclude', 'web/**',
        '--exclude', 'scripts/**',
        '--exclude', 'docs/**',
        '--resource', `"${path.join(rootDir, 'web/dist/**/*')}"`,
    ].join(' ');

    console.log(`执行命令: ${nexeCmd} ${nexeArgs}\n`);
    console.log(`使用远程源: ${remote}`);
    console.log(`目标版本: ${target}\n`);

    execSync(`"${nexeCmd}" ${nexeArgs}`, { stdio: 'inherit', cwd: rootDir });

    console.log('\n✅ EXE 构建完成!');
    console.log(`📍 输出路径: ${exePath}`);
    console.log('\n⚠️  注意事项:');
    console.log('   1. 生成的 EXE 需要与 node_modules 目录在同一位置（playwright 依赖）');
    console.log('   2. 首次运行可能需要安装 playwright 浏览器: npx playwright install');
    console.log('   3. 确保 web/dist 目录与 EXE 在同一父目录下');
    console.log('\n🎉 构建流程全部完成!');
} catch (error) {
    console.error('❌ Nexe 打包失败:', error.message);
    process.exit(1);
}
