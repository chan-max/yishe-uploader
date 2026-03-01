# 构建 EXE 可执行文件

本项目支持使用 nexe 将整个应用打包成单一的 Windows EXE 可执行文件。

## 使用方法

### 1. 安装依赖

```bash
npm install
```

### 2. 构建 EXE

```bash
npm run build:exe
```

构建过程包括三个步骤：
1. **构建前端**: 自动运行 `npm run web:build` 生成 `web/dist` 目录
2. **打包后端**: 使用 esbuild 将 ESM 格式的后端代码打包成单一的 CommonJS 文件
3. **生成 EXE**: 使用 nexe 将打包后的代码编译成 `yishe-auto-browser.exe`

### 3. 运行 EXE

构建完成后，会在项目根目录生成 `yishe-auto-browser.exe` 文件。

```bash
# 直接运行
.\yishe-auto-browser.exe
```

然后访问 `http://localhost:7010` 即可使用。

## 注意事项

### ⚠️ 重要提示

1. **Playwright 依赖**: 生成的 EXE 仍然需要 `node_modules` 目录（特别是 playwright 及其浏览器二进制文件）
   - 建议将 EXE 与 `node_modules` 放在同一目录
   - 或者在目标机器上运行 `npx playwright install` 安装浏览器

2. **前端资源**: 确保 `web/dist` 目录与 EXE 在同一父目录下
   - 默认情况下，EXE 会在其所在目录的 `web/dist` 中查找前端文件

3. **首次构建**: nexe 首次运行时需要下载 Node.js 二进制文件，可能需要较长时间（几分钟），请耐心等待

### 环境变量

可以通过环境变量自定义配置：

- `FRONTEND_DIST`: 指定前端静态文件目录（默认为 `./web/dist`）
- `YISHE_AUTO_BROWSER_CDP_USER_DATA_DIR` 或 `UPLOADER_CDP_USER_DATA_DIR`: 指定 Chrome CDP 用户数据目录

## 发布部署

如果需要在其他机器上运行，建议打包以下内容：

```
your-app/
├── yishe-auto-browser.exe
├── node_modules/          # playwright 等原生依赖
├── web/
│   └── dist/              # 前端静态文件
└── temp/                  # 临时文件目录（可选，会自动创建）
```

或者只发布 EXE，在目标机器上：

```bash
# 安装 playwright 浏览器
npx playwright install chromium
```

## 故障排除

### 问题：EXE 启动后提示"前端未构建"

**解决方案**: 
- 确保 `web/dist` 目录存在且与 EXE 在同一父目录
- 或设置环境变量 `FRONTEND_DIST` 指向正确的路径

### 问题：浏览器连接失败

**解决方案**:
- 确保已安装 playwright 浏览器: `npx playwright install`
- 检查 `node_modules` 目录是否存在

### 问题：构建失败

**解决方案**:
- 确保已运行 `npm install` 安装所有依赖
- 检查 Node.js 版本是否 >= 18.0.0
- 查看错误信息，可能需要手动安装 `nexe` 或 `esbuild`

## 技术细节

- **打包工具**: nexe (将 Node.js 应用编译为独立可执行文件)
- **代码打包**: esbuild (将 ESM 模块打包为 CommonJS)
- **目标平台**: Windows x64, Node.js 20.18.3
- **前端构建**: Vite (Vue 3 SPA)
- **预编译源**: 使用社区维护的 [urbdyn/nexe_builds](https://github.com/urbdyn/nexe_builds) 提供的预编译 Node.js 二进制文件

> [!NOTE]
> nexe 官方的预编译版本已过时（最新只到 Node.js 14.15.3）。本项目使用社区维护的 `urbdyn/nexe_builds` 仓库提供的更新版本，通过 `--remote` 参数指定远程源。
