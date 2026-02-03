<template>
  <div class="browser-page">
    <div v-if="status.message" :class="['msg', 'msg--' + status.type]">
      {{ status.message }}
    </div>
    <div class="browser-cards">
      <div class="card">
        <div class="card__title">连接状态</div>
        <div class="card__content">
          <div class="status-row">
            <span class="status-dot" :class="browserStatus?.hasInstance ? 'status-dot--ok' : 'status-dot--err'" />
            <span class="status-text">{{ browserStatus?.hasInstance ? '已连接' : '未连接' }}</span>
          </div>
          <div class="status-meta">
            <div class="meta-row"><span class="meta-k">页面数</span><span>{{ browserStatus?.pageCount ?? '-' }}</span></div>
            <div class="meta-row"><span class="meta-k">最后活动</span><span>{{ lastActivityText }}</span></div>
            <div class="meta-row"><span class="meta-k">模式</span><span>{{ browserStatus?.connection?.mode ?? '-' }}</span></div>
            <div class="meta-row"><span class="meta-k">Profile</span><span>{{ browserStatus?.connection?.profileDir ?? '-' }}</span></div>
            <div class="meta-row"><span class="meta-k">UserData</span><span class="meta-v">{{ browserStatus?.connection?.userDataDir ?? '-' }}</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card__title">连接参数</div>
        <div class="card__content">
          <div class="form-fields">
            <div class="field">
              <label>CDP User Data Dir</label>
              <input v-model="browserConfig.cdpUserDataDir" type="text" class="input" placeholder="例如：C:\temp\yishe-uploader-cdp" />
              <small>独立浏览器配置目录，首次需在该 Chrome 内登录一次</small>
            </div>
            <div class="field">
              <label>CDP 端口</label>
              <input v-model.number="browserConfig.cdpPort" type="number" class="input port-input" placeholder="9222" />
              <small>→ http://127.0.0.1:{{ browserConfig.cdpPort || 9222 }}</small>
            </div>
          </div>
          <div class="form-hint msg msg--info">
            为保证 9222 稳定可用，默认使用独立的 <code>--user-data-dir</code> 启动 Chrome。首次使用需在新打开的 Chrome 内登录一次，之后会复用该目录的登录态。
          </div>
        </div>
      </div>
    </div>
    <div class="browser-actions">
      <button type="button" class="btn btn--primary" :disabled="browserConnecting" @click="launchAndConnect">
        <span v-if="browserConnecting" class="btn__loading">连接中...</span>
        <span v-else>连接</span>
      </button>
      <button type="button" class="btn btn--secondary" :disabled="browserConnecting" @click="refreshBrowserStatus">刷新</button>
      <button type="button" class="btn btn--secondary" :disabled="portChecking" @click="checkPort">
        <span v-if="portChecking" class="btn__loading">检测中...</span>
        <span v-else>检测端口</span>
      </button>
      <button type="button" class="btn btn--danger" :disabled="browserConnecting" @click="closeBrowser">断开</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'

const API_BASE = ''
const browserConnecting = ref(false)
const portChecking = ref(false)
const defaultUserDataDir = (() => {
  const isWin = navigator.userAgent?.toLowerCase?.().includes('windows')
  return isWin ? 'C:\\temp\\yishe-uploader-cdp-1s' : '/tmp/yishe-uploader-cdp-1s'
})()
const status = reactive({ message: '', type: 'info' })
const browserStatus = ref(null)
const browserConfig = reactive({ cdpUserDataDir: defaultUserDataDir, cdpPort: 9222 })

const lastActivityText = computed(() => {
  const ts = browserStatus.value?.lastActivity
  if (!ts) return '-'
  try { return new Date(ts).toLocaleString() } catch { return String(ts) }
})

function setStatus(message, type = 'info') { status.message = message; status.type = type }
function getCdpPort() {
  const p = parseInt(browserConfig.cdpPort, 10)
  return (p > 0 && p < 65536) ? p : 9222
}

async function refreshBrowserStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/browser/status`)
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || '获取状态失败')
    browserStatus.value = data.data
  } catch (e) {
    console.error('[browser-status]', e)
    setStatus(e.message || '获取浏览器状态失败', 'error')
  }
}

async function launchAndConnect() {
  browserConnecting.value = true
  setStatus('正在启动 Chrome 并连接...', 'info')
  try {
    const port = getCdpPort()
    const userDataDir = (browserConfig.cdpUserDataDir || '').trim()
    const launchRes = await fetch(`${API_BASE}/api/browser/launch-with-debug`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port, userDataDir })
    })
    const launchData = await launchRes.json()
    if (!launchRes.ok || !launchData.success) throw new Error(launchData.message || '启动失败')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    const connectRes = await fetch(`${API_BASE}/api/browser/connect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'cdp', cdpEndpoint: `http://127.0.0.1:${port}` }),
      signal: controller.signal
    })
    clearTimeout(timer)
    const connectData = await connectRes.json()
    if (!connectRes.ok || !connectData.success) throw new Error(connectData.message || '连接失败')
    browserStatus.value = connectData.data
    setStatus('浏览器已连接', 'success')
  } catch (e) {
    const msg = e?.name === 'AbortError' ? '连接超时' : (e.message || '启动并连接失败')
    setStatus(msg, 'error')
  } finally {
    browserConnecting.value = false
  }
}

async function checkPort() {
  portChecking.value = true
  setStatus('正在检测端口...', 'info')
  try {
    const port = getCdpPort()
    const res = await fetch(`${API_BASE}/api/browser/check-port`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || '检测失败')
    const d = data.data
    if (d.ok) setStatus(`端口 ${d.port} 已开放${d.browser ? '，版本: ' + d.browser : ''}`, 'success')
    else setStatus(`端口 ${d.port} 未开放：${d.error || '无响应'}`, 'error')
  } catch (e) {
    setStatus(e.message || '检测端口失败', 'error')
  } finally {
    portChecking.value = false
  }
}

async function closeBrowser() {
  browserConnecting.value = true
  setStatus('正在断开浏览器...', 'info')
  try {
    const res = await fetch(`${API_BASE}/api/browser/close`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || '断开失败')
    browserStatus.value = data.data
    setStatus('浏览器已断开', 'success')
  } catch (e) {
    setStatus(e.message || '断开浏览器失败', 'error')
  } finally {
    browserConnecting.value = false
  }
}

let pollTimer
onMounted(() => { refreshBrowserStatus(); pollTimer = setInterval(refreshBrowserStatus, 5000) })
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<style lang="scss" scoped>
.browser-page {
  .msg { padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem; border: 1px solid; }
  .msg--success { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
  .msg--error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
  .msg--info { background: #f0f9ff; border-color: #bae6fd; color: #0c4a6e; code { background: #e0f2fe; padding: 2px 6px; border-radius: 2px; font-size: 0.8125rem; } }
  .browser-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
  .card__title { padding: 0.75rem 1rem; font-weight: 600; font-size: 0.875rem; border-bottom: 1px solid #e5e7eb; background: #fff; color: #374151; }
  .card__content { padding: 1rem; }
  .browser-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; }
  .btn { padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; border-radius: 4px; border: 1px solid; cursor: pointer; font-family: inherit; transition: background 0.12s, border-color 0.12s; &:disabled { opacity: 0.5; cursor: not-allowed; } }
  .btn--primary { background: #22c55e; border-color: #22c55e; color: #fff; &:hover:not(:disabled) { background: #16a34a; border-color: #16a34a; } }
  .btn--secondary { background: #fff; border-color: #d1d5db; color: #374151; &:hover:not(:disabled) { background: #f3f4f6; border-color: #9ca3af; } }
  .btn--danger { background: #fff; border-color: #f87171; color: #dc2626; &:hover:not(:disabled) { background: #fef2f2; border-color: #ef4444; } }
  .btn__loading { opacity: 0.9; }
  .input { width: 100%; padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 1px solid #d1d5db; border-radius: 4px; font-family: inherit; background: #fff; &:focus { outline: none; border-color: #3b82f6; } }
  .port-input { width: 8rem; }
  .status-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
  .status-text { font-weight: 600; font-size: 1rem; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .status-dot--ok { background: #22c55e; }
  .status-dot--err { background: #ef4444; }
  .status-meta { margin-top: 0.5rem; }
  .meta-row { display: flex; justify-content: space-between; padding: 0.375rem 0; border-bottom: 1px solid #f3f4f6; font-size: 0.8125rem; }
  .meta-k { color: #6b7280; margin-right: 0.5rem; }
  .meta-v { word-break: break-all; max-width: 200px; text-align: right; color: #374151; }
  .form-fields { display: flex; flex-direction: column; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.25rem; label { font-weight: 500; font-size: 0.875rem; color: #374151; } small { color: #9ca3af; font-size: 0.75rem; } }
  .form-hint { margin-top: 0.75rem; }
}
</style>
