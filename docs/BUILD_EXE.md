# 构建可执行文件、随包浏览器与最终安装包

本项目支持使用 `nexe` 生成可执行文件，组装随包浏览器发布目录，并继续生成最终安装包。

- Windows: 生成 `.exe`
- macOS: 生成 `.pkg`
- Playwright Chromium: 随发布目录一起分发，目标机器无需再手动执行 `playwright install`

## 使用方法

### 1. 安装依赖

```bash
npm install
```

### 2. 构建发布目录

```bash
npm run build:exe
```

构建过程包括四个步骤：

1. 构建前端 `web/dist`
2. 使用 `esbuild` 打包后端代码
3. 使用 `nexe` 生成可执行文件
4. 组装 `release/` 发布目录，并把 Playwright Chromium 安装到随包目录

### 3. 生成最终安装包

```bash
npm run build:installer
```

或者直接一步完成：

```bash
npm run build:dist
```

## 构建结果

构建完成后会得到两类产物：

### 根目录产物

- Windows: `yishe-uploader.exe`
- macOS: `yishe-uploader`

这个文件主要用于本机快速验证，不建议单独拿去分发。

### 发布目录 `release/<platform>/`

发布目录位于：

```bash
release/windows-x64/
release/mac-arm64/
release/mac-x64/
```

目录结构类似：

```text
release/<platform>/
├── yishe-uploader(.exe)
├── node_modules/
│   ├── playwright/
│   └── playwright-core/
├── pw-browsers/
└── web/
    └── dist/
```

这是安装包的原始输入目录。

### 最终安装包 `dist/installers/`

最终安装包会输出到：

```bash
dist/installers/
```

示例文件名：

- Windows: `yishe-auto-browser-windows-setup-v2.0.200.exe`
- macOS: `yishe-auto-browser-mac-arm64-v2.0.200.pkg`

## 为什么现在可以开箱即用

运行时会优先检测程序所在目录下的 `pw-browsers/`，并自动把 `PLAYWRIGHT_BROWSERS_PATH` 指向这里。只要安装包把整个发布目录安装到目标机器，程序启动后就能直接使用随包 Chromium。

这意味着：

- 用户不需要手动执行 `npx playwright install`
- macOS 不依赖 `~/Library/Caches/ms-playwright`
- Windows 不依赖 `%LOCALAPPDATA%\\ms-playwright`

## 最终安装后的行为

- Windows 安装器会把完整运行目录安装到用户本地应用目录，并创建快捷方式
- macOS 安装器会安装 `.app` 到 `/Applications`
- 启动安装后的程序时，会自动打开 `http://localhost:7010`

## 发布建议

### Windows

仓库已经内置 Inno Setup 打包脚本。Windows runner 安装 Inno Setup 后，执行：

```bash
npm run build:dist
```

即可得到最终安装版 `.exe`。

如果是在本地 Windows 机器执行，请先安装 Inno Setup 6，或设置环境变量 `ISCC_PATH` 指向 `ISCC.exe`。

### macOS

仓库已经内置 `.app` + `pkgbuild` 打包逻辑。macOS 上执行：

```bash
npm run build:dist
```

即可得到最终 `.pkg`。

重点是：最终安装器内部已经包含整个发布目录，而不是只装单个可执行文件。

## 重要限制

### 1. 浏览器是平台相关的

随包 Chromium 必须在对应平台构建：

- Windows 包请在 Windows 上构建
- macOS 包请在 macOS 上构建

不要在 macOS 上构建 Windows 的随包浏览器，也不要在 Windows 上构建 macOS 的随包浏览器。

### 2. 单独拷贝 exe 不够

如果只拷贝根目录里的 `yishe-uploader.exe` 或 `yishe-uploader`，而没有一起带上：

- `node_modules/playwright`
- `node_modules/playwright-core`
- `pw-browsers`
- `web/dist`

那么程序依然可能无法正常运行。请始终使用安装包，或至少使用完整的 `release/<platform>/`。

## 环境变量

支持以下覆盖项：

- `FRONTEND_DIST`: 自定义前端静态资源目录
- `PLAYWRIGHT_BROWSERS_PATH`: 强制指定 Playwright 浏览器目录
- `YISHE_PLAYWRIGHT_BROWSERS_DIR` / `UPLOADER_PLAYWRIGHT_BROWSERS_DIR`: 指定随包浏览器目录
- `YISHE_AUTO_BROWSER_CDP_USER_DATA_DIR` / `UPLOADER_CDP_USER_DATA_DIR`: 指定 Chrome CDP 用户数据目录

## 故障排除

### 问题：启动内置 Chromium 失败

优先检查：

1. 安装包是否由新版 `npm run build:installer` / `npm run build:dist` 生成
2. `pw-browsers/` 是否真实存在于程序目录旁边
3. `userDataDir` 是否可写

### 问题：前端页面打不开

优先检查：

1. 安装包里是否包含 `web/dist`
2. 是否手动只复制了 exe，而没有复制发布目录

### 问题：构建阶段下载浏览器失败

优先检查：

1. 当前机器网络是否可访问 Playwright 下载源
2. 本地是否已经完成 `npm install`
3. 是否在目标平台本机执行构建

### 问题：Windows 安装包生成失败，提示未找到 ISCC

优先检查：

1. 本机是否已安装 Inno Setup 6
2. `ISCC.exe` 是否在系统 PATH 中
3. 或者是否已设置 `ISCC_PATH`

## 技术细节

- 打包工具: `nexe` + Inno Setup / `pkgbuild`
- 后端 bundle: `esbuild`
- 浏览器运行时: `playwright` + `playwright-core`
- 随包浏览器目录: `pw-browsers`
- 前端构建: `vite`
