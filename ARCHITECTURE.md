# Yishe Uploader 架构文档

## 项目重构概述

本项目已经过全面重构，实现了代码的模块化、通用化和独立性，同时保持了各平台的独立发布能力。

## 核心架构

### 1. 通用服务层 (Services)

#### BasePublisher - 基础发布器
- **位置**: `src/services/BasePublisher.js`
- **功能**: 提供通用的发布流程模板
- **特点**: 
  - 统一的发布流程：获取浏览器 → 导航页面 → 检查登录 → 上传图片 → 填写内容 → 点击发布
  - 可重写的方法：`handleImageUpload`, `fillContent`, `clickPublishButton`, `waitForPublishComplete`, `checkLoginStatus`
  - 自动资源管理：页面创建和关闭

#### ImageManager - 图片管理器
- **位置**: `src/services/ImageManager.js`
- **功能**: 统一管理图片下载、上传、删除等操作
- **特点**:
  - 自动扩展名检测
  - 文件名规范化
  - 批量操作支持
  - 临时文件管理

#### PageOperator - 页面操作器
- **位置**: `src/services/PageOperator.js`
- **功能**: 提供通用的页面操作工具
- **特点**:
  - 反检测脚本注入
  - 安全的元素操作
  - 智能等待机制
  - 用户行为模拟

#### LoginChecker - 登录状态检查器
- **位置**: `src/services/LoginChecker.js`
- **功能**: 提供通用的登录状态检查框架
- **特点**:
  - 通用检查器：`GenericLoginChecker`
  - 平台特定检查器：`DouyinLoginChecker`, `XiaohongshuLoginChecker`
  - 智能状态描述
  - 错误处理机制

### 2. 平台实现层 (Platforms)

每个平台都基于 `BasePublisher` 实现，保持独立性：

#### 微博 (Weibo)
- **文件**: `src/platforms/weibo.js`
- **特点**: 
  - 特殊的图片上传等待逻辑
  - 按钮状态检查
  - 通用登录检查

#### 抖音 (Douyin)
- **文件**: `src/platforms/douyin.js`
- **特点**:
  - 专门的登录状态检查
  - 标题和内容分别填写
  - 特殊的发布按钮点击逻辑

#### 小红书 (Xiaohongshu)
- **文件**: `src/platforms/xiaohongshu.js`
- **特点**:
  - 反检测脚本支持
  - Tab切换预处理
  - 专门的登录检查
  - 用户行为模拟

#### 快手 (Kuaishou)
- **文件**: `src/platforms/kuaishou.js`
- **特点**:
  - 批量图片上传
  - 富文本编辑器支持
  - 文件选择器特殊处理

### 3. 配置管理层 (Config)

#### 平台配置
- **文件**: `src/config/platforms.js`
- **功能**: 统一管理所有平台的配置信息
- **包含**:
  - 上传URL
  - 页面等待策略
  - 反检测设置
  - 登录检查配置
  - 元素选择器
  - 预处理和后处理函数

### 4. 服务协调层 (Services)

#### PublishService - 发布服务
- **文件**: `src/services/PublishService.js`
- **功能**: 统一管理发布相关逻辑
- **特点**:
  - 登录状态缓存
  - 平台路由
  - 错误处理
  - 状态描述

## 设计原则

### 1. 模块独立性
- 每个平台可以独立发布
- 通用服务可单独使用
- 配置与实现分离

### 2. 代码复用
- 通用流程在 `BasePublisher` 中实现
- 平台特定逻辑通过重写方法实现
- 工具函数统一管理

### 3. 可扩展性
- 新增平台只需继承 `BasePublisher`
- 配置驱动的平台管理
- 插件化的登录检查器

### 4. 向后兼容
- 保持原有的API接口
- 渐进式迁移
- 配置兼容性

## 使用示例

### 单个平台发布
```javascript
import { publishToDouyin } from './platforms/douyin.js';

const result = await publishToDouyin({
    title: '测试标题',
    content: '测试内容',
    images: ['https://example.com/image.jpg']
});
```

### 多平台发布
```javascript
import { PublishService } from './services/PublishService.js';

const results = await Promise.all([
    PublishService.publishSingle({ platform: 'douyin', ...publishInfo }),
    PublishService.publishSingle({ platform: 'xiaohongshu', ...publishInfo })
]);
```

### 自定义平台
```javascript
import { BasePublisher } from './services/BasePublisher.js';
import { PLATFORM_CONFIGS } from './config/platforms.js';

class CustomPublisher extends BasePublisher {
    constructor() {
        super('自定义平台', PLATFORM_CONFIGS.custom);
    }
    
    async fillContent(page, publishInfo) {
        // 自定义内容填写逻辑
    }
}
```

## 文件结构

```
src/
├── services/           # 通用服务层
│   ├── BasePublisher.js    # 基础发布器
│   ├── ImageManager.js     # 图片管理器
│   ├── PageOperator.js     # 页面操作器
│   ├── LoginChecker.js     # 登录检查器
│   ├── BrowserService.js    # 浏览器服务
│   └── PublishService.js    # 发布服务
├── platforms/          # 平台实现层
│   ├── weibo.js           # 微博发布器
│   ├── douyin.js          # 抖音发布器
│   ├── xiaohongshu.js      # 小红书发布器
│   └── kuaishou.js        # 快手发布器
├── config/             # 配置管理层
│   ├── platforms.js       # 平台配置
│   └── constants.js       # 常量配置
├── utils/              # 工具层
│   └── logger.js          # 日志工具
└── index.js            # 主入口文件
```

## 优势

1. **代码复用**: 减少了约70%的重复代码
2. **维护性**: 统一的架构便于维护和调试
3. **扩展性**: 新增平台只需实现特定逻辑
4. **独立性**: 各平台保持独立，可单独使用
5. **配置化**: 通过配置管理平台差异
6. **类型安全**: 清晰的接口定义和错误处理

## 迁移指南

### 从旧版本迁移
1. 原有的API接口保持不变
2. 新增的通用服务可直接使用
3. 配置方式更加灵活
4. 错误处理更加完善

### 开发新平台
1. 继承 `BasePublisher` 类
2. 在 `platforms.js` 中添加配置
3. 重写需要自定义的方法
4. 在 `PublishService` 中注册路由
