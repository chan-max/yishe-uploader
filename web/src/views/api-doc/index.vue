<template>
  <div class="api-doc-page">
    <div v-if="error" class="ui error message">{{ error }}</div>
    <div v-else class="ui segments">
      <div class="ui segment">
        <h3 class="ui dividing header">接口概览</h3>
        <p v-if="apiInfo">Base URL: <code>{{ baseUrl }}</code> · {{ apiInfo.name }} v{{ apiInfo.version }}</p>
        <div class="ui relaxed list">
          <div v-for="ep in endpoints" :key="ep.method + ep.path" class="item">
            <span class="ui horizontal label" :class="methodClass(ep.method)">{{ ep.method }}</span>
            <code>{{ ep.path }}</code>
            <span class="description">{{ ep.description }}</span>
          </div>
        </div>
      </div>

      <div class="ui segment">
        <h3 class="ui dividing header">发布接口 POST /api/publish</h3>
        <p>单平台与多平台均传 <code>platforms</code>（数组）：单平台如 <code>["douyin"]</code>，多平台如 <code>["douyin", "xiaohongshu"]</code>。</p>
        <h4 class="ui header">请求体参数</h4>
        <table class="ui celled compact table small">
          <thead>
            <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
          </thead>
          <tbody>
            <tr><td><code>platforms</code></td><td>string[]</td><td>是</td><td>平台 ID 数组，如 ["douyin"] 或 ["douyin", "xiaohongshu"]</td></tr>
            <tr><td><code>title</code></td><td>string</td><td>是</td><td>作品标题</td></tr>
            <tr><td><code>filePath</code></td><td>string</td><td>是</td><td>本机视频/图片绝对路径（如 C:\videos\demo.mp4），无需上传</td></tr>
            <tr><td><code>tags</code></td><td>string[]</td><td>否</td><td>话题标签</td></tr>
            <tr><td><code>concurrent</code></td><td>boolean</td><td>否</td><td>多平台时是否并发，默认 false</td></tr>
            <tr><td><code>platformSettings</code></td><td>object</td><td>否</td><td>如 douyin.productLink、productTitle</td></tr>
          </tbody>
        </table>
        <h4 class="ui header">单平台请求示例</h4>
        <pre class="code-block">{{ singleExample }}</pre>
        <h4 class="ui header">多平台请求示例</h4>
        <pre class="code-block">{{ batchExample }}</pre>
      </div>

      <div class="ui segment">
        <h3 class="ui dividing header">其他接口</h3>
        <p><strong>GET /api</strong> — 本概览的 JSON；<strong>GET /api/docs</strong> — OpenAPI 3.0 风格文档（机器可读）。</p>
        <p>定时发布：<strong>POST /api/schedule</strong>，需 <code>platforms</code>、<code>scheduleTime</code> 及与发布相同的参数（含 <code>filePath</code> 本地路径）。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const API_BASE = ''
const apiInfo = ref(null)
const endpoints = ref([])
const error = ref('')

const baseUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.location.origin.replace(/:\d+$/, ':7010')
})

const singleExample = `{
  "platforms": ["douyin"],
  "title": "作品标题",
  "filePath": "C:\\videos\\demo.mp4",
  "tags": ["美食", "探店"]
}`

const batchExample = `{
  "platforms": ["douyin", "xiaohongshu", "weibo"],
  "title": "作品标题",
  "filePath": "C:\\videos\\demo.mp4",
  "tags": ["美食"],
  "concurrent": false
}`

function methodClass(m) {
  if (m === 'GET') return 'green'
  if (m === 'POST') return 'blue'
  return ''
}

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/api`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '获取失败')
    apiInfo.value = { name: data.name, version: data.version }
    endpoints.value = data.endpoints || []
  } catch (e) {
    error.value = e.message || '无法加载 API 概览，请确保后端已启动（默认 7010 端口）'
    endpoints.value = [
      { method: 'GET', path: '/api', description: 'API 概览' },
      { method: 'GET', path: '/api/docs', description: 'API 文档 JSON' },
      { method: 'POST', path: '/api/publish', description: '发布（platform 或 platforms）' },
      { method: 'POST', path: '/api/upload', description: '上传文件' },
      { method: 'GET', path: '/api/login-status', description: '登录状态' },
      { method: 'GET', path: '/api/browser/status', description: '浏览器状态' }
    ]
  }
})
</script>

<style lang="scss" scoped>
.api-doc-page {
  .code-block {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    font-size: 0.85em;
    overflow-x: auto;
    margin: 0.5rem 0;
  }
  .ui.table.small { font-size: 0.9em; }
  .description { color: #666; margin-left: 0.5rem; }
}
</style>
