<template>
  <div class="publish-page">
    <div v-if="status.message" :class="['msg', 'msg--' + status.type]">{{ status.message }}</div>
    <div class="card">
      <div class="card__title">发布内容</div>
      <div class="card__content">
        <div class="form-fields">
          <div class="field">
            <label>发布平台</label>
            <div class="platform-chips">
              <label v-for="p in platformList" :key="p.id" class="chip" :class="{ 'chip--active': form.platforms.includes(p.id) }">
                <input v-model="form.platforms" type="checkbox" :value="p.id" class="chip-input" />
                <span class="chip-label">{{ p.icon }} {{ p.name }}</span>
              </label>
            </div>
            <small>请先连接浏览器并在各平台登录后再发布</small>
          </div>
          <div class="field">
            <label>视频文件</label>
            <div class="upload-zone" @click="triggerFileInput" @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="onDrop">
              <input ref="fileInputRef" type="file" accept="video/*" class="upload-input" @change="onFileSelect" />
              <span v-if="!form.filePath" class="upload-placeholder">{{ dragOver ? '松开上传' : '点击或拖拽视频到此处' }}</span>
              <span v-else class="upload-filename">{{ uploadedFilename }}</span>
            </div>
            <small>支持 MP4、MOV 等，最大 4GB。上传后由服务端保存到临时目录供发布使用。</small>
          </div>
          <div class="field">
            <label>标题</label>
            <input v-model="form.title" type="text" class="input" placeholder="作品标题（如抖音限 30 字）" maxlength="100" />
          </div>
          <div class="field">
            <label>话题标签</label>
            <input v-model="tagsInput" type="text" class="input" placeholder="多个标签用空格或逗号分隔，如：美食 探店" />
            <small>发布时会自动加上 # 前缀</small>
          </div>
          <div class="field">
            <label>定时发布</label>
            <div class="row">
              <label class="checkbox-wrap"><input v-model="form.scheduled" type="checkbox" /><span>启用定时</span></label>
              <input v-if="form.scheduled" v-model="form.scheduleTime" type="datetime-local" class="input input--datetime" />
            </div>
          </div>
          <div v-if="form.platforms.includes('douyin')" class="field platform-extra">
            <label>抖音设置</label>
            <div class="sub-fields">
              <input v-model="form.platformSettings.douyin.productLink" type="text" class="input" placeholder="商品链接（选填）" />
              <input v-model="form.platformSettings.douyin.productTitle" type="text" class="input" placeholder="商品短标题（选填）" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="publish-actions">
      <button type="button" class="btn btn--primary" :disabled="publishing || !canPublish" @click="handlePublish">
        <span v-if="publishing" class="btn__loading">发布中...</span>
        <span v-else>发布</span>
      </button>
      <button type="button" class="btn btn--secondary" :disabled="loginLoading" @click="refreshLoginStatus">
        {{ loginLoading ? '检测中...' : '刷新登录状态' }}
      </button>
    </div>
    <div v-if="Object.keys(loginStatus).length" class="card login-status-card">
      <div class="card__title">各平台登录状态</div>
      <div class="card__content">
        <div class="status-grid">
          <div v-for="(info, platformId) in loginStatus" :key="platformId" class="status-item">
            <span class="status-dot" :class="info.isLoggedIn ? 'status-dot--ok' : 'status-dot--err'" />
            <span class="status-name">{{ platformName(platformId) }}</span>
            <span class="status-msg">{{ info.message || (info.isLoggedIn ? '已登录' : '未登录') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const API_BASE = ''
const fileInputRef = ref(null)
const platformList = [
  { id: 'douyin', name: '抖音', icon: '🎵' },
  { id: 'kuaishou', name: '快手', icon: '⚡' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕' },
  { id: 'weibo', name: '微博', icon: '🔥' }
]
const status = reactive({ message: '', type: 'info' })
const publishing = ref(false)
const loginLoading = ref(false)
const dragOver = ref(false)
const supportedPlatforms = ref([])
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

const uploadedFilename = computed(() => (form.filePath ? form.filePath.split(/[/\\]/).pop() || '已选择' : ''))
const canPublish = computed(() => form.platforms.length > 0 && form.filePath && form.title.trim().length > 0)

function platformName(id) { return platformList.find(p => p.id === id)?.name || id }
function setStatus(message, type = 'info') { status.message = message; status.type = type }
function triggerFileInput() { fileInputRef.value?.click() }
function onFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) { form.file = file; form.filePath = file.name; form._fileObj = file }
  e.target.value = ''
}
function onDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('video/')) { form.file = file; form.filePath = file.name; form._fileObj = file }
}

async function uploadFile() {
  if (!form._fileObj) return null
  const fd = new FormData()
  fd.append('file', form._fileObj)
  const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.message || '上传失败')
  return data.path
}

async function fetchPlatforms() {
  try {
    const res = await fetch(`${API_BASE}/api/platforms`)
    const data = await res.json()
    if (res.ok && data.platforms) supportedPlatforms.value = data.platforms
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
  setStatus('正在上传视频并发布...', 'info')
  try {
    const filePath = await uploadFile()
    if (!filePath) { setStatus('请先选择视频文件', 'error'); publishing.value = false; return }
    const tags = tagsInput.value.split(/[\s,，]+/).map(t => t.trim()).filter(Boolean)
    const body = {
      platforms: form.platforms,
      title: form.title.trim(),
      tags,
      filePath,
      scheduled: form.scheduled,
      scheduleTime: form.scheduled && form.scheduleTime ? new Date(form.scheduleTime).toISOString() : undefined,
      platformSettings: { douyin: form.platformSettings.douyin, xiaohongshu: form.platformSettings.xiaohongshu }
    }
    const res = await fetch(`${API_BASE}/api/publish/batch`, {
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
      form.filePath = ''
      form._fileObj = null
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

onMounted(() => { fetchPlatforms(); refreshLoginStatus() })
</script>

<style lang="scss" scoped>
.publish-page {
  .msg { padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; border: 1px solid; }
  .msg--success { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
  .msg--error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
  .msg--info { background: #f0f9ff; border-color: #bae6fd; color: #0c4a6e; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 1rem; overflow: hidden; }
  .card__title { padding: 0.75rem 1rem; font-weight: 600; font-size: 0.875rem; border-bottom: 1px solid #e5e7eb; color: #374151; }
  .card__content { padding: 1rem; }
  .form-fields { display: flex; flex-direction: column; gap: 1rem; }
  .field { display: flex; flex-direction: column; gap: 0.25rem; label { font-weight: 500; font-size: 0.875rem; color: #374151; } small { color: #9ca3af; font-size: 0.75rem; } }
  .platform-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .chip { display: inline-flex; align-items: center; padding: 0.375rem 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 0.875rem; background: #fff; transition: background 0.12s, border-color 0.12s; .chip-input { position: absolute; opacity: 0; width: 0; height: 0; } &.chip--active { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; } }
  .chip-label { user-select: none; }
  .upload-zone { position: relative; border: 1px dashed #d1d5db; border-radius: 4px; padding: 1.25rem; text-align: center; cursor: pointer; background: #fafafa; transition: background 0.12s, border-color 0.12s; &:hover { background: #f3f4f6; border-color: #9ca3af; } }
  .upload-input { position: absolute; width: 0; height: 0; opacity: 0; }
  .upload-placeholder, .upload-filename { font-size: 0.875rem; color: #6b7280; }
  .upload-filename { color: #059669; }
  .input { width: 100%; padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 1px solid #d1d5db; border-radius: 4px; font-family: inherit; &:focus { outline: none; border-color: #3b82f6; } }
  .input--datetime { max-width: 16rem; margin-top: 0.5rem; }
  .row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .checkbox-wrap { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer; input { width: 1rem; height: 1rem; } }
  .platform-extra .sub-fields { display: flex; flex-direction: column; gap: 0.5rem; }
  .publish-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
  .btn { padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; border-radius: 4px; border: 1px solid; cursor: pointer; font-family: inherit; transition: background 0.12s, border-color 0.12s; &:disabled { opacity: 0.5; cursor: not-allowed; } }
  .btn--primary { background: #22c55e; border-color: #22c55e; color: #fff; &:hover:not(:disabled) { background: #16a34a; border-color: #16a34a; } }
  .btn--secondary { background: #fff; border-color: #d1d5db; color: #374151; &:hover:not(:disabled) { background: #f3f4f6; border-color: #9ca3af; } }
  .btn__loading { opacity: 0.9; }
  .login-status-card .status-grid { display: flex; flex-direction: column; gap: 0.5rem; }
  .status-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .status-dot--ok { background: #22c55e; }
  .status-dot--err { background: #ef4444; }
  .status-name { font-weight: 500; min-width: 4rem; }
  .status-msg { color: #6b7280; }
}
</style>
