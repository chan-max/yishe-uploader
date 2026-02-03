<template>
  <div class="browser-page">
    <div v-if="status.message" :class="['ui', 'message', statusTypeClass]">
      {{ status.message }}
    </div>

    <div class="ui two column grid">
      <div class="column">
        <div class="ui segment">
          <h3 class="ui dividing header">连接状态</h3>
          <div class="status-indicator">
            <span class="status-dot" :class="{ ok: browserStatus?.hasInstance, fail: !browserStatus?.hasInstance }"></span>
            <span>{{ browserStatus?.hasInstance ? '已连接' : '未连接' }}</span>
          </div>
          <div class="ui list" style="margin-top: 1rem;">
            <div class="item"><strong>页面数</strong><span class="right floated">{{ browserStatus?.pageCount ?? '-' }}</span></div>
            <div class="item"><strong>最后活动</strong><span class="right floated">{{ lastActivityText }}</span></div>
            <div class="item"><strong>模式</strong><span class="right floated">{{ browserStatus?.connection?.mode ?? '-' }}</span></div>
            <div class="item"><strong>Profile</strong><span class="right floated">{{ browserStatus?.connection?.profileDir ?? '-' }}</span></div>
            <div class="item"><strong>UserData</strong><span class="right floated meta-v">{{ browserStatus?.connection?.userDataDir ?? '-' }}</span></div>
          </div>
        </div>
      </div>
      <div class="column">
        <div class="ui segment">
          <h3 class="ui dividing header">连接参数</h3>
          <div class="ui small form">
            <div class="field">
              <label>CDP User Data Dir</label>
              <input v-model="browserConfig.cdpUserDataDir" type="text" placeholder="例如：C:\temp\yishe-uploader-cdp" />
              <small style="color: #999;">独立浏览器配置目录，首次需在该 Chrome 内登录一次</small>
            </div>
            <div class="field">
              <label>CDP 端口</label>
              <input v-model.number="browserConfig.cdpPort" type="number" placeholder="9222" style="max-width: 8rem;" />
              <small style="color: #999;">→ http://127.0.0.1:{{ browserConfig.cdpPort || 9222 }}</small>
            </div>
          </div>
          <div class="ui small info message" style="margin-top: 0.75rem;">
            为保证 9222 稳定可用，默认使用独立的 <code>--user-data-dir</code> 启动 Chrome。首次使用需在新打开的 Chrome 内登录一次，之后会复用该目录的登录态。
          </div>
        </div>
      </div>
    </div>

    <div class="ui segment" style="margin-top: 1rem;">
      <div class="ui small buttons">
        <button type="button" class="ui primary button" :class="{ loading: browserConnecting }" :disabled="browserConnecting" @click="launchAndConnect">
          连接
        </button>
        <button type="button" class="ui button" :disabled="browserConnecting" @click="refreshBrowserStatus">刷新</button>
        <button type="button" class="ui button" :class="{ loading: portChecking }" :disabled="portChecking" @click="checkPort">
          检测端口
        </button>
        <button type="button" class="ui red button" :disabled="browserConnecting" @click="closeBrowser">断开</button>
      </div>
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

const statusTypeClass = computed(() => {
  if (status.type === 'success') return 'success'
  if (status.type === 'error') return 'error'
  return 'info'
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
  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9em;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #999;
    &.ok { background: #21ba45; }
    &.fail { background: #db2828; }
  }
  .meta-v { word-break: break-all; max-width: 200px; }
  .ui.list .item { display: flex; justify-content: space-between; align-items: center; }
}
</style>
