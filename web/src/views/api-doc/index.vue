<template>
  <div class="api-doc-page">
    <div v-if="error" class="ui error message">{{ error }}</div>
    <div v-else>
      <div class="ui segment">
        <h2 class="ui header">
          <i class="book icon"></i>
          <div class="content">
            API 开发人员文档
            <div class="sub header">统一发布接口参数说明与各平台个性化配置</div>
          </div>
        </h2>
      </div>

      <!-- 核心发布接口 -->
      <div class="ui segment p-4">
        <h3 class="ui dividing header">🚀 核心发布接口: POST /api/publish</h3>
        <p>这是该项目最核心的接口，支持将同一份内容同时发布到多个社交平台。</p>

        <h4 class="ui header">通用请求参数 (Payload)</h4>
        <table class="ui celled table small">
          <thead>
            <tr><th>参数名</th><th>类型</th><th>必填</th><th>说明</th></tr>
          </thead>
          <tbody>
            <tr><td><code>platforms</code></td><td>string[]</td><td><b>是</b></td><td>目标平台 ID 数组。可选值：<code>douyin</code>, <code>kuaishou</code>, <code>xiaohongshu</code>, <code>weibo</code>, <code>youtube</code>, <code>tiktok</code>, <code>xianyu</code></td></tr>
            <tr><td><code>title</code></td><td>string</td><td><b>是</b></td><td>作品标题。部分平台（如小红书、YouTube）会显示在标题栏；部分平台（如抖音、微博）会拼接到正文头部。</td></tr>
            <tr><td><code>content</code></td><td>string</td><td>否</td><td>作品正文描述。若不传则尝试使用 <code>title</code> 作为正文。</td></tr>
            <tr><td><code>filePath</code></td><td>string</td><td>否</td><td><b>本地文件路径</b>。必须是服务端程序所在机器的可访问绝对路径（如 <code>C:\videos\1.mp4</code>）。发布视频时使用。</td></tr>
            <tr><td><code>images</code></td><td>string[]</td><td>否</td><td>远程图片 URL 数组。发布图文作品（如小红书、微博、咸鱼）时使用。程序会自动下载。</td></tr>
            <tr><td><code>tags</code></td><td>string[]</td><td>否</td><td>话题标签数组。不带 <code>#</code> 号，如 <code>["美食", "探店"]</code>。</td></tr>
            <tr><td><code>concurrent</code></td><td>boolean</td><td>否</td><td>是否开启并发发布。默认 <code>false</code>（串行发布更稳定）。</td></tr>
            <tr><td><code>platformSettings</code></td><td>object</td><td>否</td><td><b>平台个性化配置</b>。键名为平台 ID。</td></tr>
          </tbody>
        </table>
      </div>

      <!-- 分平台参数说明 - Tab 切换 -->
      <div class="ui segment platform-tabs-segment">
        <h3 class="ui dividing header">🎨 平台个性化配置参数 (platformSettings)</h3>
        
        <div class="ui pointing secondary menu platform-menu">
          <a class="item" :class="{ active: activePlatform === 'douyin' }" @click="activePlatform = 'douyin'">
            <span class="platform-icon">🎵</span> 抖音
          </a>
          <a class="item" :class="{ active: activePlatform === 'xiaohongshu' }" @click="activePlatform = 'xiaohongshu'">
            <span class="platform-icon">📕</span> 小红书
          </a>
          <a class="item" :class="{ active: activePlatform === 'youtube' }" @click="activePlatform = 'youtube'">
            <span class="platform-icon">📹</span> YouTube
          </a>
          <a class="item" :class="{ active: activePlatform === 'xianyu' }" @click="activePlatform = 'xianyu'">
            <span class="platform-icon">🐟</span> 咸鱼
          </a>
          <a class="item" :class="{ active: activePlatform === 'others' }" @click="activePlatform = 'others'">
            <span class="platform-icon">✨</span> 其他
          </a>
        </div>

        <div class="ui segment tab-content-segment">
          <!-- 抖音 -->
          <div v-if="activePlatform === 'douyin'" class="platform-pane">
            <h4 class="ui header">抖音 (douyin) 配置项</h4>
            <table class="ui compact basic table">
              <thead><tr><th width="150">参数</th><th width="100">类型</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>productLink</code></td><td>string</td><td>商品链接（带货视频可选）。</td></tr>
                <tr><td><code>productTitle</code></td><td>string</td><td>商品短标题（带货视频可选，最高 10 字）。</td></tr>
                <tr><td><code>thumbnail</code></td><td>string</td><td>自定义封面路径（本地绝对路径）。</td></tr>
                <tr><td><code>location</code></td><td>string</td><td>地理位置名称。</td></tr>
              </tbody>
            </table>
          </div>

          <!-- 小红书 -->
          <div v-if="activePlatform === 'xiaohongshu'" class="platform-pane">
            <h4 class="ui header">小红书 (xiaohongshu) 配置项</h4>
            <p class="ui small info text">注：小红书发布时，若 <code>filePath</code> 为空则视为发布<b>图文</b>（需提供 <code>images</code> 列表）。</p>
            <table class="ui compact basic table">
              <thead><tr><th width="150">参数</th><th width="100">类型</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>location</code></td><td>string</td><td>打卡地点名称。</td></tr>
              </tbody>
            </table>
          </div>

          <!-- YouTube -->
          <div v-if="activePlatform === 'youtube'" class="platform-pane">
            <h4 class="ui header">YouTube (youtube) 配置项</h4>
            <table class="ui compact basic table">
              <thead><tr><th width="150">参数</th><th width="100">类型</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>privacy</code></td><td>string</td><td>可见性：<code>public</code> (公开), <code>private</code> (私有), <code>unlisted</code> (不列出)。默认为 <code>public</code>。</td></tr>
              </tbody>
            </table>
          </div>

          <!-- 咸鱼 -->
          <div v-if="activePlatform === 'xianyu'" class="platform-pane">
            <h4 class="ui header">咸鱼 (xianyu) 配置项</h4>
            <p class="ui small warning text">注：发布咸鱼商品时<b>价格 (price)</b> 是必须提供的参数。</p>
            <table class="ui compact basic table">
              <thead><tr><th width="150">参数</th><th width="100">类型</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>price</code></td><td>number</td><td>展示价格。</td></tr>
                <tr><td><code>category</code></td><td>string</td><td>分类名称（需在页面下拉框中存在）。</td></tr>
                <tr><td><code>condition</code></td><td>string</td><td>成色：<code>new</code> (全新), <code>like-new</code> (99新), <code>used</code> (二手), <code>damaged</code> (瑕疵)。</td></tr>
                <tr><td><code>tradeMethod</code></td><td>string</td><td>交易方式：<code>online</code> (线上), <code>offline</code> (面交), <code>both</code> (线上/面交)。</td></tr>
                <tr><td><code>location</code></td><td>string</td><td>发货地点。</td></tr>
              </tbody>
            </table>
          </div>

          <!-- 其他 -->
          <div v-if="activePlatform === 'others'" class="platform-pane">
            <h4 class="ui header">其他平台 (快手, 微博, TikTok)</h4>
            <p>这些平台目前主要使用通用参数：</p>
            <ul class="ui list">
              <li><code>title</code>: 视频标题</li>
              <li><code>content</code>: 视频描述</li>
              <li><code>tags</code>: 标签</li>
              <li><code>filePath</code>: 本地视频绝对路径</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- JSON 示例 -->
      <div class="ui segment">
        <h3 class="ui dividing header">📝 完整调用示例 (JSON)</h3>
        <pre class="code-block">{{ fullExample }}</pre>
      </div>

      <!-- 响应格式 -->
      <div class="ui segment">
        <h3 class="ui dividing header">📥 响应格式</h3>
        <pre class="code-block">{{ responseExample }}</pre>
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

// 当前选中的平台页签
const activePlatform = ref('douyin')

const baseUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.location.origin.replace(/:\d+$/, ':7010')
})

const fullExample = ref(JSON.stringify({
  platforms: ["douyin", "xiaohongshu", "xianyu"],
  title: "我是作品标题",
  content: "我是作品的长描述文本，支持换行...",
  filePath: "D:\\Movies\\test.mp4",
  images: ["https://example.com/pic1.jpg", "https://example.com/pic2.jpg"],
  tags: ["技术", "开源"],
  platformSettings: {
    douyin: {
      productLink: "https://v.douyin.com/xxx/",
      location: "上海市"
    },
    xianyu: {
      price: 99.0,
      condition: "new",
      tradeMethod: "online"
    }
  }
}, null, 2))

const responseExample = ref(JSON.stringify({
  success: true,
  successCount: 2,
  total: 3,
  results: [
    { platform: "douyin", success: true, message: "发布成功" },
    { platform: "xiaohongshu", success: true, message: "发布成功" },
    { platform: "xianyu", success: false, message: "咸鱼未登录" }
  ]
}, null, 2))

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/api`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '获取失败')
    apiInfo.value = { name: data.name, version: data.version }
    endpoints.value = data.endpoints || []
  } catch (e) {
    console.warn('Backend API connection failed for dynamic docs')
  }
})
</script>

<style lang="scss" scoped>
.api-doc-page {
  padding-bottom: 3rem;
  
  .code-block {
    background: #1e1e1e;
    color: #dcdcdc;
    padding: 1.5rem;
    border-radius: 8px;
    font-size: 0.9em;
    font-family: 'Fira Code', 'Consolas', monospace;
    overflow-x: auto;
    margin: 1rem 0;
    box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
    border: 1px solid #333;
  }
  
  .ui.table.small { font-size: 0.9em; }
  .p-4 { padding: 1.5rem !important; }
  
  .platform-tabs-segment {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
  }
  
  .platform-menu {
    border-bottom: 2px solid #f1f1f1 !important;
    margin-bottom: 0 !important;
    
    .item {
      font-weight: 600 !important;
      padding: 1rem 1.5rem !important;
      transition: all 0.3s ease;
      font-size: 1.05rem;
      
      &:hover {
        background: rgba(0,0,0,0.02) !important;
      }
      
      &.active {
        border-color: #2185d0 !important;
        color: #2185d0 !important;
        background: transparent !important;
      }
      
      .platform-icon {
        margin-right: 8px;
        font-size: 1.2rem;
      }
    }
  }
  
  .tab-content-segment {
    border: none !important;
    box-shadow: none !important;
    padding: 2rem 1rem !important;
    min-height: 300px;
    background: #fff;
    
    .platform-pane {
      animation: fadeIn 0.4s ease-out;
      
      h4.ui.header {
        margin-bottom: 1.5rem;
        color: #333;
        display: flex;
        align-items: center;
        
        &::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #eee;
          margin-left: 15px;
        }
      }
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
</style>
