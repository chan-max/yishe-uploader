# 构建可执行文件与直连分发文件

本项目使用 `nexe` 生成可执行文件，再组装 `release/` 单文件发布目录并继续生成最终直连分发文件。

当前策略已经切回：

- 运行时默认使用目标机器的本地 `Chrome`
- 程序不再附带 `Chromium` 或 `pw-browsers`
- 发布目录仅包含程序本体

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
4. 组装 `release/` 发布目录

### 3. 生成最终直连文件

```bash
npm run build:installer
```

或者直接一步完成：

```bash
npm run build:dist
```

## 构建结果

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
└── yishe-uploader(.exe)
```

这是单文件发布目录。

### 最终直连文件 `dist/installers/`

最终直连文件会输出到：

```bash
dist/installers/
```

示例文件名：

- Windows: `yishe-auto-browser-windows.exe`
- macOS: `yishe-auto-browser-mac`

## 运行要求

- 目标机器需要已安装本地 `Chrome`
- 程序统一使用 `cdp` 模式连接本地 Chrome
- 默认会优先绑定当前活动环境对应的调试端口

当前直连文件不附带浏览器二进制，因此不会再生成或分发 `pw-browsers/`。

## 下载后的行为

- Windows: 下载 `yishe-auto-browser-windows.exe` 后，双击即可使用
- macOS: 下载 `yishe-auto-browser-mac` 后，赋予执行权限并双击即可使用
- 启动程序时，会自动打开 `http://localhost:7010`

## 发布建议

### Windows

仓库现在会直接生成可分发的 Windows 单文件。执行：

```bash
npm run build:dist
```

即可得到最终直连文件。

### macOS

仓库会直接生成可分发的 macOS 单文件。macOS 上执行：

```bash
npm run build:dist
```

即可得到最终直连文件。

## 重要说明

### 1. 直连文件就是分发文件

当前版本会把所需运行时代码直接打进单文件里。给用户分发时，优先使用 `dist/installers/` 里的最终文件，或 `release/<platform>/` 里的 `yishe-uploader(.exe)`。

### 2. 目标机器必须有本地 Chrome

当前版本默认通过 Playwright 驱动本地 Chrome，不再依赖随包浏览器。

## 环境变量

支持以下覆盖项：

- `FRONTEND_DIST`: 自定义前端静态资源目录
- `CHROME_EXECUTABLE_PATH`: 自定义本地 Chrome 可执行文件路径
- `YISHE_AUTO_BROWSER_CDP_USER_DATA_DIR` / `UPLOADER_CDP_USER_DATA_DIR`: 指定 Chrome CDP 用户数据目录

## 故障排除

### 问题：启动本地 Chrome 失败

优先检查：

1. 本机 Chrome 是否已安装
2. 当前 Chrome 是否已完全关闭，避免 profile 被占用
3. `CHROME_EXECUTABLE_PATH` 是否指向真实可执行文件

### 问题：前端页面打不开

优先检查：

1. 是否使用了最新构建产物
2. 是否被安全软件隔离或拦截

## 技术细节

- 打包工具: `nexe`
- 后端 bundle: `esbuild`
- 浏览器运行时: `playwright-core` + 本地 Chrome
- 前端构建: `vite`
