import { execSync } from 'child_process';
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
const tempInstallerDir = path.resolve(process.env.YISHE_BUILD_TEMP_DIR || path.join(rootDir, 'temp-build'), 'installer');
const releaseDirName = platform === 'win32' ? 'windows-x64' : platform === 'darwin' ? `mac-${arch}` : `${platform}-${arch}`;
const releaseDir = path.join(rootDir, 'release', releaseDirName);
const releaseExecutableName = platform === 'win32' ? 'yishe-uploader.exe' : 'yishe-uploader';
const releaseExecutablePath = path.join(releaseDir, releaseExecutableName);

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

function copyDirContents(sourceDir, targetDir) {
    ensureDir(targetDir);
    const entries = fs.readdirSync(sourceDir);
    for (const entry of entries) {
        fs.cpSync(path.join(sourceDir, entry), path.join(targetDir, entry), {
            recursive: true,
            force: true,
        });
    }
}

function writeTextFile(filePath, contents, mode) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, contents);
    if (mode) {
        fs.chmodSync(filePath, mode);
    }
}

function findCommandOnPath(command) {
    try {
        const probeCommand = platform === 'win32' ? `where ${command}` : `command -v ${command}`;
        const output = execSync(probeCommand, {
            cwd: rootDir,
            stdio: ['ignore', 'pipe', 'ignore'],
            encoding: 'utf8',
        }).trim();
        const firstLine = output.split(/\r?\n/).find(Boolean);
        return firstLine ? firstLine.trim() : null;
    } catch {
        return null;
    }
}

function resolveWindowsInstallerLanguage(isccPath) {
    const realCompilerDirs = Array.from(new Set([
        path.dirname(isccPath || ''),
        'C:\\Program Files (x86)\\Inno Setup 6',
        'C:\\Program Files\\Inno Setup 6',
    ].filter(Boolean)));

    for (const compilerDir of realCompilerDirs) {
        const chineseSimplifiedPath = path.join(compilerDir, 'Languages', 'ChineseSimplified.isl');
        if (fs.existsSync(chineseSimplifiedPath)) {
            return {
                name: 'chinesesimplified',
                messagesFile: chineseSimplifiedPath,
            };
        }
    }

    return {
        name: 'english',
        messagesFile: 'compiler:Default.isl',
    };
}

function createMacAppBundle() {
    const appBundleName = 'Yishe Auto Browser.app';
    const stagingRoot = path.join(tempInstallerDir, 'macos');
    const appBundlePath = path.join(stagingRoot, appBundleName);
    const contentsDir = path.join(appBundlePath, 'Contents');
    const macOSDir = path.join(contentsDir, 'MacOS');
    const resourcesDir = path.join(contentsDir, 'Resources');
    const launcherName = 'YisheAutoBrowserLauncher';
    const launcherPath = path.join(macOSDir, launcherName);
    const plistPath = path.join(contentsDir, 'Info.plist');
    const pkgOutputPath = path.join(distDir, `yishe-auto-browser-mac-${arch}-v${version}.pkg`);

    cleanDir(stagingRoot);
    ensureDir(macOSDir);
    ensureDir(resourcesDir);
    copyDirContents(releaseDir, macOSDir);
    fs.chmodSync(path.join(macOSDir, releaseExecutableName), 0o755);

    writeTextFile(
        launcherPath,
        `#!/bin/sh
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export YISHE_OPEN_BROWSER_ON_START=1
exec "$SCRIPT_DIR/${releaseExecutableName}" "$@"
`,
        0o755
    );

    writeTextFile(
        plistPath,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>zh_CN</string>
    <key>CFBundleExecutable</key>
    <string>${launcherName}</string>
    <key>CFBundleIdentifier</key>
    <string>com.yishe.auto-browser</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Yishe Auto Browser</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${version}</string>
    <key>CFBundleVersion</key>
    <string>${version}</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
`
    );

    ensureDir(distDir);
    fs.rmSync(pkgOutputPath, { force: true });
    execSync(
        `pkgbuild --component "${appBundlePath}" --install-location "/Applications" --identifier "com.yishe.auto-browser" --version "${version}" "${pkgOutputPath}"`,
        { cwd: rootDir, stdio: 'inherit' }
    );

    return {
        appBundlePath,
        pkgOutputPath,
    };
}

function buildWindowsInstaller() {
    const installerScriptPath = path.join(rootDir, 'scripts', 'installers', 'yishe-auto-browser.iss');
    const outputBaseFilename = `yishe-auto-browser-windows-setup-v${version}`;
    const commonCandidates = [
        process.env.ISCC_PATH,
        findCommandOnPath('iscc'),
        'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
        'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
    ].filter(Boolean);
    const isccPath = commonCandidates.find((candidate) => {
        if (!candidate) return false;
        if (candidate.toLowerCase().endsWith('.exe')) {
            return fs.existsSync(candidate);
        }
        return true;
    });

    if (!isccPath) {
        throw new Error('未找到 Inno Setup 编译器 ISCC。请先安装 Inno Setup 6，或设置 ISCC_PATH。');
    }

    const installerLanguage = resolveWindowsInstallerLanguage(isccPath);

    ensureDir(distDir);
    assertExists(installerScriptPath, 'Inno Setup 脚本');

    console.log(`使用安装器语言: ${installerLanguage.name}`);
    console.log(`消息文件: ${installerLanguage.messagesFile}`);

    execSync(
        `"${isccPath}" /DAppVersion="${version}" /DReleaseDir="${releaseDir}" /DOutputDir="${distDir}" /DOutputBaseFilename="${outputBaseFilename}" /DAppExeName="${releaseExecutableName}" /DInstallerLanguageName="${installerLanguage.name}" /DInstallerMessagesFile="${installerLanguage.messagesFile}" "${installerScriptPath}"`,
        {
            cwd: rootDir,
            stdio: 'inherit',
        }
    );

    return {
        installerPath: path.join(distDir, `${outputBaseFilename}.exe`),
    };
}

console.log('🚀 开始生成最终安装包...\n');
assertExists(releaseDir, '发布目录');
assertExists(releaseExecutablePath, '发布目录中的可执行文件');

try {
    if (platform === 'darwin') {
        const result = createMacAppBundle();
        console.log('\n✅ macOS 安装包已生成');
        console.log(`📍 App Bundle: ${result.appBundlePath}`);
        console.log(`📍 PKG: ${result.pkgOutputPath}`);
    } else if (platform === 'win32') {
        const result = buildWindowsInstaller();
        console.log('\n✅ Windows 安装包已生成');
        console.log(`📍 Setup EXE: ${result.installerPath}`);
    } else {
        throw new Error(`当前平台暂不支持生成安装包: ${platform}`);
    }
} catch (error) {
    console.error('❌ 生成安装包失败:', error.message);
    process.exit(1);
}
