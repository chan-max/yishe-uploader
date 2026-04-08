# 构建可执行文件与无浏览器安装包

本项目使用 `nexe` 生成可执行文件，再组装 `release/` 发布目录并继续生成最终安装包。

当前策略已经切回：

- 运行时默认使用目标机器的本地 `Chrome`
- 安装包不再附带 `Chromium` 或 `pw-browsers`
- 发布目录仅包含程序本体、前端静态资源和 Playwright 运行时依赖

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

### 3. 生成最终安装包

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
├── yishe-uploader(.exe)
├── node_modules/
│   ├── playwright/
│   └── playwright-core/
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

## 运行要求

- 目标机器需要已安装本地 `Chrome`
- 程序默认使用 `persistent` 模式连接本地 Chrome
- 如需连接远程调试端口，可使用 `cdp` 模式

当前安装包不附带浏览器二进制，因此不会再生成或分发 `pw-browsers/`。

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

## 重要说明

### 1. 单独拷贝 exe 不够

如果只拷贝根目录里的 `yishe-uploader.exe` 或 `yishe-uploader`，而没有一起带上：

- `node_modules/playwright`
- `node_modules/playwright-core`
- `web/dist`

那么程序依然可能无法正常运行。请始终使用安装包，或至少使用完整的 `release/<platform>/`。

### 2. 目标机器必须有本地 Chrome

当前版本默认通过 Playwright 驱动本地 Chrome，不再依赖随包浏览器。

## 环境变量

支持以下覆盖项：

- `FRONTEND_DIST`: 自定义前端静态资源目录
- `CHROME_USER_DATA_DIR`: 持久化模式下自定义用户数据目录
- `CHROME_PROFILE_DIR`: 持久化模式下指定 Chrome Profile
- `CHROME_EXECUTABLE_PATH`: 自定义本地 Chrome 可执行文件路径
- `YISHE_AUTO_BROWSER_CDP_USER_DATA_DIR` / `UPLOADER_CDP_USER_DATA_DIR`: 指定 Chrome CDP 用户数据目录

## 故障排除

### 问题：启动本地 Chrome 失败

优先检查：

1. 本机 Chrome 是否已安装
2. 当前 Chrome 是否已完全关闭，避免 profile 被占用
3. `CHROME_PROFILE_DIR` 是否配置正确
4. `CHROME_EXECUTABLE_PATH` 是否指向真实可执行文件

### 问题：前端页面打不开

优先检查：

1. 安装包里是否包含 `web/dist`
2. 是否手动只复制了 exe，而没有复制发布目录

### 问题：Windows 安装包生成失败，提示未找到 ISCC

优先检查：

1. 本机是否已安装 Inno Setup 6
2. `ISCC.exe` 是否在系统 PATH 中
3. 或者是否已设置 `ISCC_PATH`

## 技术细节

- 打包工具: `nexe` + Inno Setup / `pkgbuild`
- 后端 bundle: `esbuild`
- 浏览器运行时: `playwright` + `playwright-core`
- 前端构建: `vite`
