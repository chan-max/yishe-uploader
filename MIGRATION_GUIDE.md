# 迁移指南

本文档说明了从 `social-auto-upload` (Python) 到 `yishe-uploader` (JavaScript) 的迁移过程和主要差异。

## 📋 概述

`yishe-uploader` 是基于 `social-auto-upload` 项目的 JavaScript 重构版本，采用了更现代的技术栈和架构设计。

## 🔄 主要变化

### 技术栈

| 方面 | social-auto-upload | yishe-uploader |
|------|-------------------|----------------|
| 语言 | Python 3.x | JavaScript (Node.js 18+) |
| 浏览器自动化 | Playwright (Python) | Playwright (JavaScript) |
| 前端界面 | 无 | Vue 3 + Element Plus |
| API服务 | 无 | RESTful API (Node.js HTTP) |
| 状态管理 | 文件系统 | Pinia + LocalStorage |

### 架构设计

#### Python 版本
```
social-auto-upload/
├── uploader/
│   ├── douyin_uploader/main.py
│   ├── ks_uploader/main.py
│   └── ...
├── utils/
└── examples/
```

#### JavaScript 版本
```
yishe-uploader/
├── frontend/          # 新增：Vue3 前端
├── src/
│   ├── api/          # 新增：API 服务层
│   ├── platforms/    # 对应 uploader/
│   ├── services/     # 新增：服务抽象
│   └── utils/        # 对应 utils/
```

## 🎯 平台实现对比

### 抖音 (Douyin)

#### Python 版本核心流程
```python
async def upload(self, playwright: Playwright):
    browser = await playwright.chromium.launch()
    context = await browser.new_context(storage_state=account_file)
    page = await context.new_page()
    await page.goto("https://creator.douyin.com/...")
    # ... 上传和发布逻辑
```

#### JavaScript 版本核心流程
```javascript
async publish(publishInfo) {
    const browser = await getOrCreateBrowser();
    const page = await browser.newPage();
    await this.pageOperator.setupAntiDetection(page);
    await douyinAuth.applyAuth(page);
    await page.goto(this.uploadUrl);
    // ... 上传和发布逻辑
}
```

### 主要改进

1. **浏览器管理**
   - Python: 每次创建新实例
   - JavaScript: 复用浏览器实例，提高性能

2. **认证管理**
   - Python: 直接使用 storage_state
   - JavaScript: 独立的认证模块，支持多种方式

3. **错误处理**
   - Python: 基础的 try-catch
   - JavaScript: 完善的错误处理和重试机制

4. **日志系统**
   - Python: loguru
   - JavaScript: 自定义 logger，支持多级别

## 🔧 功能对比

### 已实现功能

| 功能 | Python | JavaScript | 说明 |
|------|--------|-----------|------|
| 抖音发布 | ✅ | ✅ | 完全兼容 |
| 快手发布 | ✅ | ✅ | 完全兼容 |
| 小红书发布 | ✅ | ✅ | 图片+视频 |
| 微博发布 | ✅ | ✅ | 基础功能 |
| 腾讯视频号 | ✅ | 🚧 | 开发中 |
| B站发布 | ✅ | 🚧 | 开发中 |
| TikTok | ✅ | 🚧 | 开发中 |
| 百家号 | ✅ | 🚧 | 开发中 |
| Web界面 | ❌ | ✅ | 新增 |
| API接口 | ❌ | ✅ | 新增 |
| 批量发布 | ❌ | ✅ | 新增 |
| 定时发布 | ✅ | ✅ | 改进 |

### 新增功能

1. **Web 管理界面**
   - 可视化操作
   - 账号管理
   - 发布历史
   - 实时状态

2. **RESTful API**
   - 单平台发布
   - 批量发布
   - 定时任务
   - 状态查询

3. **服务化架构**
   - BrowserService: 浏览器管理
   - PublishService: 发布服务
   - ImageManager: 媒体管理
   - LoginChecker: 登录检查

## 📝 代码迁移示例

### 示例 1: 发布视频

#### Python 版本
```python
from uploader.douyin_uploader.main import DouYinVideo

video = DouYinVideo(
    title="视频标题",
    file_path="video.mp4",
    tags=["标签1", "标签2"],
    publish_date=0,
    account_file="account.json"
)

asyncio.run(video.main())
```

#### JavaScript 版本
```javascript
import { publishToDouyin } from './src/platforms/douyin.js';

const result = await publishToDouyin({
    title: "视频标题",
    videoUrl: "video.mp4",
    tags: ["标签1", "标签2"],
    scheduled: false
});

console.log(result);
```

### 示例 2: 批量发布

#### Python 版本
```python
# 需要自己实现循环
platforms = ['douyin', 'kuaishou']
for platform in platforms:
    # 调用对应平台的上传函数
    pass
```

#### JavaScript 版本
```javascript
import { batchPublish } from './src/api/publishService.js';

const result = await batchPublish(
    ['douyin', 'kuaishou'],
    {
        title: "视频标题",
        videoUrl: "video.mp4",
        tags: ["标签1", "标签2"]
    },
    { concurrent: false }  // 顺序发布
);
```

## 🔐 认证方式对比

### Python 版本
```python
# 使用 storage_state 文件
context = await browser.new_context(
    storage_state="cookies/douyin_uploader/account.json"
)
```

### JavaScript 版本
```javascript
// 方式1: 浏览器配置文件（推荐）
const browser = await getOrCreateBrowser({
    mode: 'persistent',
    userDataDir: '/path/to/chrome/user/data',
    profileDir: 'Default'
});

// 方式2: CDP 连接
const browser = await getOrCreateBrowser({
    mode: 'cdp',
    cdpEndpoint: 'http://127.0.0.1:9222'
});

// 方式3: Cookie 文件
await douyinAuth.applyAuth(page);
```

## 🎨 UI 元素定位对比

### Python 版本
```python
# 使用 Playwright Python API
await page.locator("div[class^='container'] input").set_input_files(file_path)
await page.get_by_text('作品标题').locator("..").locator("xpath=following-sibling::div[1]").locator("input").fill(title)
```

### JavaScript 版本
```javascript
// 使用 Playwright JavaScript API
await page.locator("div[class^='container'] input").first().setInputFiles(filePath);
await page.locator('text=作品标题')
    .locator('..')
    .locator('xpath=following-sibling::div[1]')
    .locator('input')
    .fill(title);
```

**注意**: API 基本相同，主要差异是命名风格（Python 的 snake_case vs JavaScript 的 camelCase）

## 📦 依赖管理

### Python 版本
```txt
# requirements.txt
playwright>=1.40.0
asyncio
loguru
```

### JavaScript 版本
```json
{
  "dependencies": {
    "playwright": "^1.55.0",
    "axios": "^1.10.0",
    "vue": "^3.4.0",
    "element-plus": "^2.5.0"
  }
}
```

## 🚀 性能优化

### JavaScript 版本的优化

1. **浏览器复用**
   - Python: 每次创建新实例
   - JavaScript: 全局单例，复用连接

2. **并发发布**
   - Python: 顺序执行
   - JavaScript: 支持 Promise.all 并发

3. **资源管理**
   - Python: 手动管理
   - JavaScript: 自动清理，内存优化

## 🐛 常见问题

### Q1: 为什么选择 JavaScript 重写？

**A:** 
- 更好的前端集成（Vue3）
- 统一的技术栈
- 更活跃的生态系统
- 更容易部署和分发

### Q2: 功能是否完全兼容？

**A:** 
- 核心功能（抖音、快手、小红书、微博）已完全兼容
- 其他平台正在逐步迁移
- 新增了 Web 界面和 API 接口

### Q3: 如何从 Python 版本迁移？

**A:**
1. 保留原有的 Cookie 文件
2. 使用新的配置格式
3. 调整代码调用方式
4. 测试各平台功能

## 📚 参考资源

- [social-auto-upload 原项目](https://github.com/dreammis/social-auto-upload)
- [Playwright 文档](https://playwright.dev/)
- [Vue3 文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)

## 🤝 贡献指南

欢迎贡献代码！

1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 发起 Pull Request

---

感谢 social-auto-upload 项目提供的灵感和参考！
