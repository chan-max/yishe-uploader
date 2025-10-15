# Yishe Uploader

多媒体自动发布脚本仓库 - 支持微博、抖音、小红书、快手等平台的自动化发布功能。

## 功能特性

- 🚀 **多平台支持**: 微博、抖音、小红书、快手
- 🤖 **自动化发布**: 基于 Puppeteer 的浏览器自动化
- 🛡️ **反检测机制**: 内置反爬虫检测规避
- 🔄 **网络恢复**: 自动处理网络连接问题
- 📊 **状态监控**: 实时监控发布状态和登录状态
- 🎯 **批量发布**: 支持多平台同时发布
- 📝 **CLI 工具**: 命令行界面，易于使用

## 支持的平台

| 平台 | 状态 | 功能 |
|------|------|------|
| 微博 | ✅ | 图文发布 |
| 抖音 | ✅ | 图文发布 |
| 小红书 | ✅ | 图文发布 |
| 快手 | ✅ | 图文发布 |

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd yishe-uploader

# 安装依赖
npm install
```

## 使用方法

### 命令行使用

```bash
# 发布到单个平台
node src/index.js publish --platform weibo --title "标题" --content "内容" --images "image1.jpg,image2.jpg"

# 发布到多个平台
node src/index.js publish --platforms weibo,douyin,xiaohongshu --title "标题" --content "内容" --images "image1.jpg"

# 检查登录状态
node src/index.js check-login

# 测试发布
node src/index.js test

# 浏览器管理
node src/index.js browser --status
node src/index.js browser --close
node src/index.js browser --clear-data
```

### 编程方式使用

```javascript
import { PublishService } from './src/services/PublishService.js';

// 发布到多个平台
const results = await PublishService.publishToMultiplePlatforms([
  {
    platform: 'weibo',
    title: '测试标题',
    content: '测试内容',
    images: ['https://example.com/image.jpg']
  },
  {
    platform: 'douyin',
    title: '测试标题',
    content: '测试内容',
    images: ['https://example.com/image.jpg']
  }
]);

console.log('发布结果:', results);
```

## 配置

### 环境变量

复制 `env.example` 为 `.env` 并修改配置：

```env
# 浏览器配置
BROWSER_HEADLESS=false
BROWSER_USER_DATA_DIR=./user-data

# 网络配置
NETWORK_CHECK_INTERVAL=30000
NETWORK_TIMEOUT=10000

# 重试配置
MAX_RETRIES=3
RETRY_DELAY=2000

# 调试配置
DEBUG=false
NODE_ENV=development
```

### 平台配置

各平台的发布 URL 和选择器配置在 `src/config/platforms.js` 中：

```javascript
export const PLATFORM_CONFIGS = {
  weibo: {
    name: '微博',
    uploadUrl: 'https://weibo.com',
    selectors: {
      contentInput: 'textarea[class^="Form_input_"]',
      fileInput: 'input[type="file"]',
      submitButton: '[class^="Tool_check_"] button'
    }
  },
  // ... 其他平台配置
};
```

## 项目结构

```
yishe-uploader/
├── src/
│   ├── platforms/          # 各平台发布脚本
│   │   ├── weibo.js
│   │   ├── douyin.js
│   │   ├── xiaohongshu.js
│   │   ├── kuaishou.js
│   ├── services/           # 核心服务
│   │   ├── PublishService.js
│   │   └── BrowserService.js
│   ├── utils/              # 工具函数
│   │   ├── antiDetection.js
│   │   ├── fileUtils.js
│   │   └── logger.js
│   ├── config/             # 配置文件
│   │   ├── platforms.js
│   │   └── constants.js
│   └── index.js            # 主入口
├── test/                   # 测试文件
│   └── index.js
├── package.json
├── env.example
└── readme.md
```

## 开发

```bash
# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 使用示例

### 1. 检查登录状态

```bash
node src/index.js check-login
```

### 2. 发布到单个平台

```bash
node src/index.js publish \
  --platform douyin \
  --title "我的作品" \
  --content "今天分享一些有趣的内容 #生活 #分享" \
  --images "https://example.com/image1.jpg,https://example.com/image2.jpg"
```

### 3. 批量发布到多个平台

```bash
node src/index.js publish \
  --platforms weibo,douyin,xiaohongshu \
  --title "多平台发布测试" \
  --content "这是一条测试内容" \
  --images "https://example.com/image.jpg"
```

### 4. 测试发布功能

```bash
node src/index.js test --platform douyin
```

## 注意事项

1. **登录状态**: 使用前请确保已在各平台完成登录
2. **网络环境**: 建议在稳定的网络环境下使用
3. **频率控制**: 避免过于频繁的发布操作
4. **内容合规**: 确保发布内容符合各平台规范
5. **图片格式**: 支持 JPG、PNG 等常见图片格式
6. **文件大小**: 注意各平台的图片大小限制

## 故障排除

### 常见问题

1. **浏览器启动失败**
   - 检查系统是否安装了 Chrome 浏览器
   - 尝试清除用户数据：`node src/index.js browser --clear-data`

2. **登录状态检查失败**
   - 确保网络连接正常
   - 手动登录各平台后再运行脚本

3. **发布失败**
   - 检查内容是否符合平台规范
   - 确认图片链接可访问
   - 查看详细错误日志

### 调试模式

```bash
# 启用调试模式
DEBUG=true node src/index.js check-login
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持微博、抖音、小红书、快手、B站发布
- 完整的 CLI 工具
- 反检测机制
- 登录状态检查