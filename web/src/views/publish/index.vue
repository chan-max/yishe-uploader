<template>
  <div class="publish-page">
    <div class="publish-layout">
      <!-- 左侧：发布表单 -->
      <div class="publish-left">
        <div v-if="status.message" :class="['ui', 'message', statusMsgClass]">{{ status.message }}</div>

        <div class="ui segment">
          <h3 class="ui dividing header">发布内容</h3>
          <div class="ui small form">
            <div class="field">
              <label>发布平台</label>
              <div class="platform-chips">
                <div v-for="p in platformList" :key="p.id" class="ui checkbox">
                  <input v-model="form.platforms" type="checkbox" :value="p.id" :id="'platform-' + p.id" />
                  <label :for="'platform-' + p.id">{{ p.icon }} {{ p.name }}</label>
                </div>
              </div>
              <small style="color: #999;">可多选。当前页面默认执行各平台的“发布”动作，后续同平台可扩展更多动作能力。</small>
            </div>

            <div class="field">
              <label>视频/图片本地路径</label>
              <input v-model="form.filePath" type="text" placeholder="如：C:\videos\demo.mp4 或 /path/to/video.mp4" />
              <small style="color: #999;">填写本机绝对路径，服务端会直接使用该路径发布（无需上传）。</small>
            </div>

            <div class="field">
              <label>标题</label>
              <input v-model="form.title" type="text" placeholder="作品标题（如抖音限 30 字）" maxlength="100" />
            </div>

            <div class="field">
              <label>话题标签</label>
              <input v-model="tagsInput" type="text" placeholder="多个标签用空格或逗号分隔，如：美食 探店" />
              <small style="color: #999;">发布时会自动加上 # 前缀</small>
            </div>

            <div class="field">
              <label>定时发布</label>
              <div class="inline fields">
                <div class="field">
                  <div class="ui checkbox">
                    <input v-model="form.scheduled" type="checkbox" id="scheduled" />
                    <label for="scheduled">启用定时</label>
                  </div>
                </div>
                <div v-if="form.scheduled" class="field">
                  <input v-model="form.scheduleTime" type="datetime-local" style="max-width: 16rem;" />
                </div>
              </div>
            </div>

            <div v-if="form.platforms.includes('douyin')" class="field">
              <label>抖音设置</label>
              <div class="two fields">
                <div class="field">
                  <input v-model="form.platformSettings.douyin.productLink" type="text" placeholder="商品链接（选填）" />
                </div>
                <div class="field">
                  <input v-model="form.platformSettings.douyin.productTitle" type="text" placeholder="商品短标题（选填）" />
                </div>
              </div>
            </div>
          </div>

          <div class="ui small buttons" style="margin-top: 1rem;">
            <button type="button" class="ui primary button" :class="{ loading: publishing }" :disabled="publishing || !canPublish" @click="handlePublish">
              发布
            </button>
            <button type="button" class="ui button" :class="{ loading: loginLoading }" :disabled="loginLoading" @click="refreshLoginStatus">
              刷新登录状态
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧：登录状态 + 接口说明（自适应宽度铺满，超出可滚动） -->
      <div class="publish-right">
        <div v-if="Object.keys(loginStatus).length" class="ui segment">
          <h3 class="ui dividing header">登录状态</h3>
          <div class="ui relaxed divided list">
            <div v-for="(info, platformId) in loginStatus" :key="platformId" class="item">
              <span class="status-indicator">
                <span class="status-dot" :class="{ ok: info.isLoggedIn, fail: !info.isLoggedIn }"></span>
                <span class="status-name">{{ platformName(platformId) }}</span>
              </span>
              <span class="status-msg">{{ info.message || (info.isLoggedIn ? '已登录' : '未登录') }}</span>
            </div>
          </div>
        </div>

        <div class="ui segment api-doc-card">
          <h3 class="ui dividing header">接口说明</h3>
          <p class="api-doc-desc">对外统一使用 <strong>POST /api/publish</strong>，核心参数是 <code>platforms</code> 和可选 <code>action</code>。当前页面默认 <code>action=publish</code>，后续同平台可以扩展更多动作而不必新增一套平台体系。</p>
          <div v-if="platformCatalog.length" class="capability-list">
            <div v-for="item in platformCatalog" :key="item.id" class="capability-item">
              <div class="capability-title">{{ item.name }} <span class="capability-category">{{ item.category }}</span></div>
              <div class="capability-actions">
                <span v-for="cap in item.capabilities" :key="cap.key" class="ui tiny basic label">{{ cap.name }}</span>
              </div>
            </div>
          </div>
          <router-link to="/api-doc" class="ui small primary button fluid">
            <i class="book icon"></i> 查看 API 文档
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const API_BASE = ''
const platformList = [
  { id: 'douyin', name: '抖音', icon: '🎵' },
  { id: 'kuaishou', name: '快手', icon: '⚡' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕' },
  { id: 'weibo', name: '微博', icon: '🔥' }
]
const status = reactive({ message: '', type: 'info' })
const publishing = ref(false)
const loginLoading = ref(false)
const supportedPlatforms = ref([])
const platformCatalog = ref([])
const loginStatus = ref({})
const form = reactive({
  platforms: [],
  filePath: '',
  title: '',
  scheduled: false,
  scheduleTime: '',
  platformSettings: { douyin: { productLink: '', productTitle: '', location: '' }, xiaohongshu: { location: '' } }
})
const tagsInput = ref('')

const canPublish = computed(() => form.platforms.length > 0 && form.filePath.trim() && form.title.trim().length > 0)

const statusMsgClass = computed(() => {
  if (status.type === 'success') return 'success'
  if (status.type === 'error') return 'error'
  return 'info'
})

function platformName(id) { return platformList.find(p => p.id === id)?.name || id }
function setStatus(message, type = 'info') { status.message = message; status.type = type }

async function fetchPlatforms() {
  try {
    const res = await fetch(`${API_BASE}/api/platforms`)
    const data = await res.json()
    if (res.ok && data.platforms) supportedPlatforms.value = data.platforms
    if (res.ok && Array.isArray(data.items)) platformCatalog.value = data.items
  } catch (e) { console.error('[platforms]', e) }
}

async function refreshLoginStatus() {
  loginLoading.value = true
  setStatus('正在检测各平台登录状态...', 'info')
  try {
    const res = await fetch(`${API_BASE}/api/login-status?refresh=1`)
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || '获取失败')
    loginStatus.value = data.data || {}
    setStatus('登录状态已刷新', 'success')
  } catch (e) {
    setStatus(e.message || '获取登录状态失败', 'error')
  } finally {
    loginLoading.value = false
  }
}

async function handlePublish() {
  if (!canPublish.value) return
  publishing.value = true
  setStatus('正在发布...', 'info')
  try {
    const filePath = form.filePath.trim()
    const tags = tagsInput.value.split(/[\s,，]+/).map(t => t.trim()).filter(Boolean)
    const body = {
      platforms: form.platforms,
      action: 'publish',
      title: form.title.trim(),
      tags,
      filePath,
      scheduled: form.scheduled,
      scheduleTime: form.scheduled && form.scheduleTime ? new Date(form.scheduleTime).toISOString() : undefined,
      platformSettings: { douyin: form.platformSettings.douyin, xiaohongshu: form.platformSettings.xiaohongshu }
    }
    const res = await fetch(`${API_BASE}/api/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || data.error || '发布请求失败')
    const successCount = data.successCount ?? 0
    const total = data.total ?? 0
    if (successCount > 0) {
      setStatus(`发布完成：成功 ${successCount}/${total} 个平台`, 'success')
      form.title = ''
      tagsInput.value = ''
    } else {
      setStatus(data.results?.[0]?.message || data.message || '发布失败', 'error')
    }
  } catch (e) {
    setStatus(e.message || '发布失败', 'error')
  } finally {
    publishing.value = false
  }
}

onMounted(() => { fetchPlatforms() })
</script>

<style lang="scss" scoped>
.publish-page {
  .publish-layout {
    display: flex;
    gap: 1rem;
    align-items: stretch;
    min-height: calc(100vh - 160px);
  }
  .publish-left {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 640px;
  }
  .publish-right {
    flex: 1 1 0;
    min-width: 280px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .platform-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    .ui.checkbox { margin: 0; }
  }
  .status-indicator { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9em; }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #999;
    &.ok { background: #21ba45; }
    &.fail { background: #db2828; }
  }
  .status-name { font-weight: 500; min-width: 4rem; }
  .status-msg { color: #666; margin-left: 0.5rem; }
  .ui.list .item { display: flex; align-items: center; justify-content: space-between; }
  .api-doc-card .api-doc-desc { font-size: 0.85em; color: #555; margin-bottom: 0.75rem; line-height: 1.5; }
  .api-doc-card code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  .capability-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.75rem; }
  .capability-item { padding: 0.65rem 0.75rem; border-radius: 10px; background: #f8fafc; border: 1px solid #e5e7eb; }
  .capability-title { font-size: 0.92em; font-weight: 600; color: #1f2937; margin-bottom: 0.35rem; }
  .capability-category { margin-left: 0.5rem; font-size: 0.82em; color: #6b7280; text-transform: capitalize; }
  .capability-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
}
</style>
