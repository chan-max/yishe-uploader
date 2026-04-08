import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = String(packageJson.version || '0.0.0').trim() || '0.0.0';
const platform = process.platform;
const arch = process.arch;
const distDir = path.join(rootDir, 'dist', 'installers');
const releaseDirName = platform === 'win32' ? 'windows-x64' : platform === 'darwin' ? `mac-${arch}` : `${platform}-${arch}`;
const releaseDir = path.join(rootDir, 'release', releaseDirName);
const releaseExecutableName = platform === 'win32' ? 'yishe-uploader.exe' : 'yishe-uploader';
const releaseExecutablePath = path.join(releaseDir, releaseExecutableName);
const directArtifactName = platform === 'win32'
    ? 'yishe-auto-browser-windows.exe'
    : platform === 'darwin'
        ? 'yishe-auto-browser-mac'
        : `yishe-auto-browser-${releaseDirName}`;
const directArtifactPath = path.join(distDir, directArtifactName);

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDistFiles(dirPath) {
    if (!fs.existsSync(dirPath)) {
        ensureDir(dirPath);
        return;
    }

    for (const entry of fs.readdirSync(dirPath)) {
        fs.rmSync(path.join(dirPath, entry), { recursive: true, force: true });
    }
}

function assertExists(targetPath, label) {
    if (!fs.existsSync(targetPath)) {
        throw new Error(`${label} 不存在: ${targetPath}`);
    }
}

function copyBinaryFile(sourceFile, targetFile, mode) {
    ensureDir(path.dirname(targetFile));
    fs.rmSync(targetFile, { force: true });
    fs.copyFileSync(sourceFile, targetFile);
    if (mode) {
        fs.chmodSync(targetFile, mode);
    }
}

console.log('🚀 开始生成最终直连文件...\n');
assertExists(releaseDir, '发布目录');
assertExists(releaseExecutablePath, '发布目录中的可执行文件');

try {
    cleanDistFiles(distDir);
    copyBinaryFile(releaseExecutablePath, directArtifactPath, platform === 'win32' ? undefined : 0o755);
    console.log(`\n✅ ${platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : platform} 直连文件已生成`);
    console.log(`📍 版本: ${version}`);
    console.log(`📍 文件: ${directArtifactPath}`);
    console.log(`📍 双击入口: ${path.basename(directArtifactPath)}`);
} catch (error) {
    console.error('❌ 生成直连文件失败:', error.message);
    process.exit(1);
}
