# 单条产品多平台发布功能

## 功能概述

这是一个额外的单条产品多平台发布功能，允许用户通过产品ID或产品代码来发布单个产品到多个社交媒体平台。

## 新增文件

### 1. 查询单个产品脚本
- **文件**: `scripts/query-single-product.js`
- **功能**: 根据产品ID或产品代码查询单个产品数据
- **用法**: 
  ```bash
  # 根据产品ID查询
  npm run query:single prod 123
  
  # 根据产品代码查询
  npm run query:single prod "" "PROD001"
  ```

### 2. 单条产品发布脚本
- **文件**: `scripts/publish-single-product.js`
- **功能**: 发布单个产品到多个平台
- **用法**:
  ```bash
  # 根据产品ID发布到所有平台
  npm run publish:single prod 123
  
  # 根据产品代码发布到所有平台
  npm run publish:single prod "" "PROD001"
  
  # 根据产品ID发布到指定平台
  npm run publish:single prod 123 "" "xiaohongshu,weibo"
  
  # 根据产品代码发布到指定平台
  npm run publish:single prod "" "PROD001" "xiaohongshu,weibo"
  ```

## 新增后端API接口

### 1. 根据产品代码查询接口
- **路径**: `POST /api/product-image-2d/find-by-code`
- **参数**: `{ "code": "产品代码" }`
- **返回**: 产品详细信息

## 使用方法

### 1. 查询产品信息
```bash
# 开发环境
npm run query:single dev 123
npm run query:single dev "" "PROD001"

# 生产环境
npm run query:single prod 123
npm run query:single prod "" "PROD001"
```

### 2. 发布产品到多个平台
```bash
# 发布到所有平台（小红书、微博、抖音、快手）
npm run publish:single prod 123

# 发布到指定平台
npm run publish:single prod 123 "" "xiaohongshu,weibo"

# 使用产品代码发布
npm run publish:single prod "" "PROD001" "xiaohongshu,weibo"
```

## 参数说明

### 环境参数
- `dev`: 开发环境 (http://localhost:1520)
- `prod`: 生产环境 (https://1s.design:1520)

### 产品标识参数
- 产品ID: 数字ID，如 `123`
- 产品代码: 字符串代码，如 `"PROD001"`

### 平台参数
- `xiaohongshu`: 小红书
- `weibo`: 微博
- `douyin`: 抖音
- `kuaishou`: 快手
- 多个平台用逗号分隔，如 `"xiaohongshu,weibo"`

## 输出示例

### 查询产品
```json
{
  "success": true,
  "data": {
    "id": "123",
    "title": "产品名称",
    "content": "产品描述",
    "tags": ["关键词1", "关键词2"],
    "images": ["图片URL1", "图片URL2"]
  }
}
```

### 发布结果
```
开始发布产品: 产品名称
目标平台: xiaohongshu, weibo, douyin, kuaishou
---
正在发布到 xiaohongshu...
✅ xiaohongshu: 发布成功
正在发布到 weibo...
✅ weibo: 发布成功
正在发布到 douyin...
❌ douyin: 未登录，请先登录该平台
正在发布到 kuaishou...
✅ kuaishou: 发布成功

发布完成: 3/4 个平台成功
✅ xiaohongshu: 发布成功
✅ weibo: 发布成功
❌ douyin: 未登录，请先登录该平台
✅ kuaishou: 发布成功
```

## 与现有功能的关系

1. **完全独立**: 新功能不影响现有的批量发布功能
2. **复用逻辑**: 使用相同的平台发布逻辑和登录检查
3. **统一接口**: 使用相同的后端API和数据结构
4. **兼容性**: 与现有的发布脚本完全兼容

## 注意事项

1. 确保已正确配置各平台的登录状态
2. 产品ID和产品代码二选一，不能同时为空
3. 如果某个平台发布失败，其他平台仍会继续发布
4. 发布结果会显示每个平台的成功/失败状态
5. 如果有平台发布失败，脚本会以退出码1结束

## 错误处理

- 产品不存在: 显示错误信息并退出
- 平台不支持: 显示不支持的平台信息
- 登录状态异常: 显示具体的登录问题
- 网络错误: 显示网络连接问题

## 扩展性

该功能设计为可扩展的，未来可以：
1. 添加更多社交媒体平台
2. 支持自定义发布参数
3. 添加发布前的验证逻辑
4. 支持批量单条发布
