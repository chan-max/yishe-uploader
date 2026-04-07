# 构建可执行文件与随包浏览器发布目录

本项目支持使用 `nexe` 生成可执行文件，并额外组装一个可直接用于制作安装包的发布目录。

- Windows: 生成 `.exe`
- macOS: 生成无扩展名可执行文件
- Playwright Chromium: 随发布目录一起分发，目标机器无需再手动执行 `playwright install`

## 使用方法

### 1. 安装依赖

```bash
npm install
```

### 2. 构建发布产物

```bash
npm run build:exe
```

构建过程包括四个步骤：

1. 构建前端 `web/dist`
2. 使用 `esbuild` 打包后端代码
3. 使用 `nexe` 生成可执行文件
4. 组装 `release/` 发布目录，并把 Playwright Chromium 安装到随包目录

## 构建结果

构建完成后会得到两类产物：

### 根目录产物

- Windows: `yishe-uploader.exe`
- macOS: `yishe-uploader`

这个文件主要用于本机快速验证，不建议单独拿去分发。

### 发布目录

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

给用户分发，或者制作安装包时，请使用整个 `release/<platform>/` 目录。

## 为什么现在可以开箱即用

运行时会优先检测程序所在目录下的 `pw-browsers/`，并自动把 `PLAYWRIGHT_BROWSERS_PATH` 指向这里。只要安装包把整个发布目录安装到目标机器，程序启动后就能直接使用随包 Chromium。

这意味着：

- 用户不需要手动执行 `npx playwright install`
- macOS 不依赖 `~/Library/Caches/ms-playwright`
- Windows 不依赖 `%LOCALAPPDATA%\\ms-playwright`

## 发布建议

### Windows

使用 Inno Setup、NSIS 或你现有的安装器，把 `release/windows-x64/` 的全部内容安装到同一个应用目录。

### macOS

使用 `pkgbuild` 或你现有的打包流程，把 `release/mac-*/` 的全部内容安装到应用目录中。

重点不是“只安装一个可执行文件”，而是“安装整个发布目录”。

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

那么程序依然可能无法正常运行。

## 环境变量

支持以下覆盖项：

- `FRONTEND_DIST`: 自定义前端静态资源目录
- `PLAYWRIGHT_BROWSERS_PATH`: 强制指定 Playwright 浏览器目录
- `YISHE_PLAYWRIGHT_BROWSERS_DIR` / `UPLOADER_PLAYWRIGHT_BROWSERS_DIR`: 指定随包浏览器目录
- `YISHE_AUTO_BROWSER_CDP_USER_DATA_DIR` / `UPLOADER_CDP_USER_DATA_DIR`: 指定 Chrome CDP 用户数据目录

## 故障排除

### 问题：启动内置 Chromium 失败

优先检查：

1. 安装包是否把整个 `release/<platform>/` 目录都装进去了
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

## 技术细节

- 打包工具: `nexe`
- 后端 bundle: `esbuild`
- 浏览器运行时: `playwright` + `playwright-core`
- 随包浏览器目录: `pw-browsers`
- 前端构建: `vite`
