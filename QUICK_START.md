# 快速开始指南

## 🎯 5分钟快速上手

### 第一步：安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend
npm install
cd ..
```

### 第二步：启动服务

打开两个终端窗口：

**终端 1 - 启动后端API服务**
```bash
npm start
```
看到 `API服务器已启动，端口: 7010` 表示成功

**终端 2 - 启动前端界面**
```bash
cd frontend
npm run dev
```
看到 `Local: http://localhost:3000` 表示成功

### 第三步：访问系统

打开浏览器访问: http://localhost:3000

## 📱 首次使用流程

### 1. 添加平台账号

1. 点击左侧菜单 "账号管理"
2. 点击右上角 "添加账号"
3. 选择平台（如：抖音）
4. 选择登录方式：
   - **浏览器登录**（推荐）：系统会打开浏览器，手动登录即可
   - **Cookie导入**：手动复制浏览器Cookie

### 2. 发布第一条内容

1. 点击左侧菜单 "内容发布"
2. 选择要发布的平台（可多选）
3. 选择内容类型：视频 或 图片
4. 上传文件
5. 填写标题和描述
6. 添加话题标签（可选）
7. 点击 "立即发布"

### 3. 查看发布结果

1. 点击左侧菜单 "发布历史"
2. 查看发布状态和结果
3. 可以筛选平台、状态、时间

## 🔧 常见问题

### Q1: 浏览器无法启动？

**A:** 确保已安装 Chrome 浏览器，并且没有其他 Chrome 进程在运行。

解决方法：
1. 完全关闭所有 Chrome 窗口
2. 打开任务管理器，结束所有 chrome.exe 进程
3. 重新启动系统

### Q2: 登录状态失效？

**A:** 重新添加账号或刷新登录状态。

解决方法：
1. 进入"账号管理"
2. 点击对应账号的"检查登录"按钮
3. 如果失效，删除后重新添加

### Q3: 上传失败？

**A:** 检查文件格式和大小。

支持的格式：
- 视频：MP4, MOV, AVI（最大4GB）
- 图片：JPG, PNG, GIF（最大20MB）

### Q4: 如何使用API接口？

**A:** 参考下面的API示例。

## 📡 API 使用示例

### 使用 curl 发布视频

```bash
curl -X POST http://localhost:7010/api/publish/batch \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["douyin", "kuaishou"],
    "title": "我的视频标题",
    "content": "视频描述内容",
    "videoUrl": "/path/to/video.mp4",
    "tags": ["生活", "美食", "旅行"]
  }'
```

### 使用 JavaScript 调用

```javascript
// 批量发布
const response = await fetch('http://localhost:7010/api/publish/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    platforms: ['douyin', 'kuaishou', 'xiaohongshu'],
    title: '我的视频标题',
    content: '视频描述内容',
    videoUrl: '/path/to/video.mp4',
    tags: ['生活', '美食'],
    platformSettings: {
      douyin: {
        productLink: 'https://example.com/product',
        productTitle: '商品名称',
        location: '北京市'
      }
    }
  })
});

const result = await response.json();
console.log(result);
```

### 使用 Python 调用

```python
import requests

url = 'http://localhost:7010/api/publish/batch'
data = {
    'platforms': ['douyin', 'kuaishou'],
    'title': '我的视频标题',
    'content': '视频描述内容',
    'videoUrl': '/path/to/video.mp4',
    'tags': ['生活', '美食']
}

response = requests.post(url, json=data)
result = response.json()
print(result)
```

## 🎨 平台特定功能

### 抖音

```json
{
  "platform": "douyin",
  "platformSettings": {
    "douyin": {
      "productLink": "商品链接",
      "productTitle": "商品标题",
      "location": "地理位置",
      "thumbnail": "/path/to/cover.jpg"
    }
  }
}
```

### 快手

```json
{
  "platform": "kuaishou",
  "tags": ["标签1", "标签2", "标签3"]  // 最多3个
}
```

### 小红书

```json
{
  "platform": "xiaohongshu",
  "platformSettings": {
    "xiaohongshu": {
      "location": "地理位置"
    }
  }
}
```

## ⏰ 定时发布

```javascript
// 创建定时任务
const response = await fetch('http://localhost:7010/api/schedule', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    platforms: ['douyin', 'kuaishou'],
    title: '定时发布的视频',
    content: '描述内容',
    videoUrl: '/path/to/video.mp4',
    scheduleTime: '2026-02-04T10:00:00Z'  // ISO 8601 格式
  })
});
```

## 🔐 安全建议

1. **不要提交认证文件**
   - `auth-data/` 目录已在 `.gitignore` 中
   - 不要将 Cookie 或认证信息提交到代码仓库

2. **定期更新登录状态**
   - 建议每周检查一次账号登录状态
   - 及时刷新失效的账号

3. **控制发布频率**
   - 避免短时间内大量发布
   - 建议使用定时发布功能分散发布时间

## 📚 进阶使用

### 批量导入账号

可以通过编程方式批量添加账号：

```javascript
const accounts = [
  { platform: 'douyin', nickname: '账号1', cookie: '...' },
  { platform: 'kuaishou', nickname: '账号2', cookie: '...' }
];

for (const account of accounts) {
  await fetch('http://localhost:7010/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account)
  });
}
```

### 自定义发布流程

```javascript
// 1. 先发布到抖音
const douyinResult = await publishToPlatform('douyin', videoInfo);

// 2. 根据结果决定是否发布到其他平台
if (douyinResult.success) {
  await publishToPlatform('kuaishou', videoInfo);
  await publishToPlatform('xiaohongshu', videoInfo);
}
```

### 监控发布状态

```javascript
// 定期检查发布历史
setInterval(async () => {
  const response = await fetch('http://localhost:7010/api/publish/history');
  const history = await response.json();
  
  // 处理发布结果
  history.list.forEach(item => {
    if (item.status === 'failed') {
      console.error('发布失败:', item.title);
      // 发送通知或重试
    }
  });
}, 60000); // 每分钟检查一次
```

## 🎓 学习资源

- [完整文档](./README.md)
- [API参考](./API.md)
- [开发指南](./DEVELOPMENT.md)
- [常见问题](./FAQ.md)

## 💬 获取帮助

遇到问题？

1. 查看 [常见问题](./FAQ.md)
2. 搜索 [GitHub Issues](https://github.com/your-username/yishe-uploader/issues)
3. 提交新的 Issue
4. 加入交流群

---

祝你使用愉快！🎉
