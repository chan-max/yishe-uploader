# Yishe Auto Browser

**Yishe Auto Browser** 是一个提供浏览器自动化相关接口的项目，支持基于 CDP 的远程控制、多平台自动发布等能力。通过 RESTful API 与 Web 管理界面，可集成到其他系统中，实现浏览器操作自动化。

## 项目定位

- 提供**浏览器自动化**相关的 HTTP API 接口
- 支持浏览器连接与管理（CDP 模式、持久化模式）
- 支持多平台内容发布（抖音、快手、小红书、微博等）
- 面向需要自动化操作的场景，可与其他系统集成

## ✨ 特性

- 🎯 **多平台支持**: 支持抖音、快手、小红书、微博、腾讯视频号、B站等主流平台
- 🎨 **现代化 UI**: 基于 Vue3 的美观管理界面
- 🔄 **批量发布**: 一键发布到多个平台，支持并发和顺序模式
- ⏰ **定时发布**: 支持设置定时发布任务
- 🎬 **多媒体支持**: 支持视频和图片内容发布
- 🤖 **反检测**: 内置反检测机制，模拟真实用户操作
- 📊 **发布历史**: 完整的发布记录和状态追踪
- 🔌 **API 接口**: 提供 RESTful API，方便集成到其他系统

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- Chrome/Chromium 浏览器

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/yishe-auto-browser.git
cd yishe-auto-browser

# 安装依赖（前后端共用同一 package.json 和 node_modules）
npm install
```

### 启动

```bash
# 一键启动：构建前端 + 启动后端（端口 7010）
npm start

# 或分别启动：
# 1. 先构建前端：npm run web:build
# 2. 再启动后端：npm run dev

# 前端开发模式（端口 5173，需后端运行在 7010）
npm run web:dev
```

访问 http://localhost:7010 即可使用 Web 界面。

### 构建 EXE 可执行文件

如果需要将项目打包成单一的 Windows EXE 可执行文件：

```bash
npm run build:exe
```

详细说明请参考 [构建 EXE 文档](docs/BUILD_EXE.md)。

## 📖 使用指南

### Web 界面使用

1. **浏览器连接**
   - 进入「浏览器」页面
   - 配置 CDP User Data Dir（留空使用推荐目录）
   - 点击「连接」启动并连接 Chrome

2. **内容发布**
   - 进入「内容发布」页面
   - 选择要发布的平台
   - 填写本机视频/图片路径（无需上传）
   - 填写标题、描述和话题标签
   - 点击「立即发布」或设置定时发布

3. **查看历史**
   - 进入「发布历史」页面
   - 查看所有发布记录和状态
   - 支持按平台、状态、时间筛选

### API 调用

发布使用**统一接口** `POST /api/publish`，单平台与多平台均传 **`platforms`**（数组）：

- **单平台**：`platforms: ["douyin"]`
- **多平台**：`platforms: ["douyin", "xiaohongshu"]`

完整参数与示例见 [docs/API.md](docs/API.md)。发现接口：`GET /api` 返回端点列表，`GET /api/docs` 返回 OpenAPI 风格 JSON。

```javascript
// 单平台
POST /api/publish  { "platforms": ["douyin"], "title": "标题", "filePath": "C:\\videos\\demo.mp4" }

// 多平台
POST /api/publish  { "platforms": ["douyin", "xiaohongshu"], "title": "标题", "filePath": "C:\\videos\\demo.mp4", "concurrent": false }
```

## 🎯 支持的平台

| 平台 | 状态 | 视频 | 图片 | 定时发布 | 特殊功能 |
|------|------|------|------|----------|----------|
| 抖音 | ✅ | ✅ | ✅ | ✅ | 商品链接、地理位置 |
| 快手 | ✅ | ✅ | ✅ | ✅ | 最多3个话题 |
| 小红书 | ✅ | ✅ | ✅ | ✅ | 地理位置 |
| 微博 | ✅ | ✅ | ✅ | ❌ | - |
| 腾讯视频号 | 🚧 | ✅ | ❌ | ✅ | 原创声明、合集 |
| B站 | 🚧 | ✅ | ❌ | ✅ | 分区选择 |
| TikTok | 🚧 | ✅ | ❌ | ✅ | - |
| 百家号 | 🚧 | ✅ | ❌ | ✅ | - |

✅ 已完成 | 🚧 开发中 | ❌ 不支持

## 🏗️ 项目结构

```
yishe-auto-browser/
├── web/                     # Vue3 前端项目
│   ├── src/
│   │   ├── views/           # 页面组件
│   │   ├── layout/          # 布局
│   │   └── ...
│   └── vite.config.js
├── src/                      # 后端源码
│   ├── api/                 # API 服务层
│   ├── config/              # 配置文件
│   ├── platforms/           # 各平台实现
│   ├── services/            # 核心服务（浏览器、发布等）
│   └── utils/               # 工具函数
└── docs/                    # 文档
```

## 🔧 配置说明

### 浏览器配置

系统支持两种浏览器连接模式：

1. **持久化模式（默认）**: 使用本地 Chrome 的用户数据目录，自动继承登录状态
   ```bash
   BROWSER_MODE=persistent
   CHROME_USER_DATA_DIR=/path/to/chrome/user/data
   CHROME_PROFILE_DIR=Default
   ```

2. **CDP 模式**: 连接已启动的 Chrome 实例
   ```bash
   BROWSER_MODE=cdp
   CDP_ENDPOINT=http://127.0.0.1:9222
   ```

CDP 用户数据目录可通过 `YISHE_AUTO_BROWSER_CDP_USER_DATA_DIR` 或 `UPLOADER_CDP_USER_DATA_DIR`（兼容）指定。

## 📄 许可证

MIT License

---

**注意**: 本项目仅供学习交流使用，请遵守各平台的使用条款和相关法律法规。
