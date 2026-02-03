# 易社发布 - 前端（独立项目）

前端代码已移至本仓库外，使用独立的 `package.json`、`node_modules` 和 `vite.config.js`。与后端项目 `yishe-uploader` 配合使用。

## 目录约定

- 建议与后端同级：`yishe-uploader/` 与 `yishe-uploader-web/` 并列存放。
- 后端默认从 `../yishe-uploader-web/dist` 提供静态资源，也可通过环境变量 `FRONTEND_DIST` 指定其他路径。

## 开发

```bash
# 安装依赖
npm install

# 开发模式（需后端 API 运行在 7010 端口）
npm run dev

# 构建（产物在 dist/，供后端托管）
npm run build

# 预览构建结果
npm run preview
```

## 与后端配合

- **开发时**：在本项目执行 `npm run dev`，Vite 开发服务器端口 5173，将 `/api` 代理到 `http://localhost:7010`。后端需单独在 `yishe-uploader` 中执行 `npm run dev`。
- **生产时**：在本项目执行 `npm run build` 生成 `dist/`，后端从该目录提供静态文件（默认路径为 `../yishe-uploader-web/dist`，或通过 `FRONTEND_DIST` 配置）。
