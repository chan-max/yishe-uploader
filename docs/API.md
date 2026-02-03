# Yishe Uploader API 文档

**Base URL**: `http://localhost:7010`（默认端口 7010）

**发现接口**: `GET /api` 返回 API 概览与端点列表；`GET /api/docs` 返回 OpenAPI 3.0 风格 JSON 文档。

---

## 1. 发布（统一接口）

**POST** `/api/publish`

单平台发布或多平台发布使用同一接口，通过参数区分：

- **单平台**：传 `platform`（字符串），如 `"douyin"`
- **多平台**：传 `platforms`（数组），如 `["douyin", "xiaohongshu"]`
- 不要同时传 `platform` 和 `platforms`

### 请求体（JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `platform` | string | 二选一 | 单平台 ID：`douyin` / `kuaishou` / `xiaohongshu` / `weibo` |
| `platforms` | string[] | 二选一 | 多平台 ID 数组 |
| `title` | string | 是 | 作品标题 |
| `filePath` | string | 是 | 视频/图片路径，需先通过 `POST /api/upload` 上传获得 |
| `tags` | string[] | 否 | 话题标签，发布时自动加 # |
| `scheduled` | boolean | 否 | 是否定时发布 |
| `scheduleTime` | string | 否 | ISO 时间，定时发布时必填 |
| `concurrent` | boolean | 否 | 仅多平台时有效，是否并发发布，默认 false |
| `platformSettings` | object | 否 | 各平台扩展参数，如 `{ douyin: { productLink, productTitle } }` |

### 单平台示例

```json
{
  "platform": "douyin",
  "title": "作品标题",
  "filePath": "D:\\temp\\xxx.mp4",
  "tags": ["美食", "探店"]
}
```

### 多平台示例

```json
{
  "platforms": ["douyin", "xiaohongshu", "weibo"],
  "title": "作品标题",
  "filePath": "D:\\temp\\xxx.mp4",
  "tags": ["美食"],
  "concurrent": false
}
```

### 响应

**单平台**：返回单条发布结果

```json
{
  "platform": "douyin",
  "success": true,
  "message": "发布成功",
  "timestamp": "2025-02-03T12:00:00.000Z"
}
```

**多平台**：返回汇总与各平台结果

```json
{
  "success": true,
  "total": 3,
  "successCount": 2,
  "failedCount": 1,
  "results": [
    { "platform": "douyin", "success": true, "message": "发布成功" },
    { "platform": "xiaohongshu", "success": true, "message": "发布成功" },
    { "platform": "weibo", "success": false, "message": "未登录" }
  ],
  "timestamp": "2025-02-03T12:00:00.000Z"
}
```

---

## 2. 上传文件

**POST** `/api/upload`

- **Content-Type**: `multipart/form-data`
- **字段名**: `file`
- **响应**: `{ "success": true, "path": "服务器上的路径" }`，该 `path` 用于 `POST /api/publish` 的 `filePath`

---

## 3. 定时发布

**POST** `/api/schedule`

请求体需包含 `platforms`（数组）、`scheduleTime`（ISO 时间）及与发布接口相同的 `title`、`filePath`、`tags` 等。到点后自动按多平台发布执行。

---

## 4. 平台与登录状态

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/platforms` | 支持的平台列表，响应 `{ "platforms": ["douyin", "kuaishou", "xiaohongshu", "weibo"] }` |
| GET | `/api/login-status?refresh=1` | 各平台登录状态，`refresh=1` 时强制重新检测 |

---

## 5. 浏览器

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/browser/status` | 浏览器连接状态 |
| POST | `/api/browser/connect` | 连接已有 Chrome（CDP） |
| POST | `/api/browser/close` | 关闭浏览器 |
| POST | `/api/browser/launch-with-debug` | 启动带调试端口的 Chrome，body: `{ "port": 9222, "userDataDir": "可选" }` |
| POST | `/api/browser/check-port` | 检测某端口是否为 CDP，body: `{ "port": 9222 }` |

---

## 错误响应

- **400**：参数错误，如缺少 `platform`/`platforms`、同时传两者等，响应体 `{ "success": false, "error": "说明" }`
- **500**：服务端错误，响应体 `{ "message": "错误信息" }`
