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
              <input
                v-model="browserConfig.cdpUserDataDir"
                type="text"
                placeholder="例如：C:\temp\yishe-auto-browser-cdp-1s；留空则使用推荐目录"
              />
              <small style="color: #999;">
                独立浏览器配置目录，首次需在该 Chrome 内登录一次；如留空，将使用服务端基于用户目录的推荐路径（推荐）。
              </small>
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

    <!-- 打开平台链接功能已移除 -->

    <div class="ui segment" style="margin-top: 1rem;">
      <h3 class="ui dividing header">用户数据管理 (Export / Import)</h3>
      <p class="ui small text" style="color: #666; margin-bottom: 0.75rem;">导出当前 User Data Dir 下的所有登录态、缓存等，以便在另一台设备导入继续使用。</p>
      <div class="ui small buttons">
        <button type="button" class="ui olive button" :class="{ loading: dataExporting }" :disabled="dataExporting" @click="exportUserData">
          导出数据文件 (.zip)
        </button>
        <button type="button" class="ui teal button" :class="{ loading: dataImporting }" :disabled="dataImporting" @click="triggerImport">
          导入数据文件
        </button>
      </div>
      <input ref="importFileInput" type="file" accept=".zip" style="display: none;" @change="handleImportFile" />
      <div v-if="dataImporting || dataExporting" class="ui tiny warning message">
        提示：该操作会自动关闭已运行的浏览器窗口以确保数据完整，且大型目录可能需要几分钟压缩/解压时间。
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'

const API_BASE = ''
// 平台打开功能已移除
const browserConnecting = ref(false)
const portChecking = ref(false)
const defaultUserDataDir = (() => {
  const ua = navigator.userAgent?.toLowerCase?.() || ''
  const isWin = ua.includes('windows')
  // Windows 下给出一个合理的本地目录，避免每次手填
  if (isWin) return 'C:\\temp\\yishe-auto-browser-cdp-1s'
  // 非 Windows（macOS / Linux）默认留空，后端将使用基于家目录的推荐路径
  return ''
})()
const status = reactive({ message: '', type: 'info' })
const browserStatus = ref(null)
const browserConfig = reactive({ cdpUserDataDir: defaultUserDataDir, cdpPort: 9222 })
const dataExporting = ref(false)
const dataImporting = ref(false)
const importFileInput = ref(null)

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
    const cdpUserDataDir = (browserConfig.cdpUserDataDir || '').trim()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    const connectRes = await fetch(`${API_BASE}/api/browser/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port, cdpUserDataDir: cdpUserDataDir || undefined }),
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

// openPlatform 功能已移除

async function exportUserData() {
  dataExporting.value = true
  setStatus('正在压缩并准备导出数据，大型目录可能需要较长时间，请稍候...', 'info')
  try {
    const userDataDir = (browserConfig.cdpUserDataDir || '').trim()
    const url = `${API_BASE}/api/browser/export-user-data?userDataDir=${encodeURIComponent(userDataDir)}`
    
    // 直接跳转执行下载
    window.location.href = url
    
    setStatus('数据导出连接已建立，请在下载完成后查看', 'success')
    // 假设下载请求已发，稍微延迟后取消 loading 态
    setTimeout(() => { dataExporting.value = false }, 5000)
  } catch (e) {
    setStatus(e.message || '导出失败', 'error')
    dataExporting.value = false
  }
}

function triggerImport() {
  importFileInput.value.click()
}

async function handleImportFile(event) {
  const file = event.target.files[0]
  if (!file) return
  
  if (!confirm('导入数据将彻底覆盖当前的 User Data Dir 目录，建议先备份重要数据。是否继续？')) {
    event.target.value = ''
    return
  }
  
  dataImporting.value = true
  setStatus('正在上传并导入数据，大型文件耗时较长，请在此期间不要刷新或关闭页面...', 'info')
  try {
    const userDataDir = (browserConfig.cdpUserDataDir || '').trim()
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await fetch(`${API_BASE}/api/browser/import-user-data?userDataDir=${encodeURIComponent(userDataDir)}`, {
      method: 'POST',
      body: formData
    })
    
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || '导入失败')
    
    setStatus('用户数据导入成功！您可以点击“连接”重新开启浏览器。', 'success')
    refreshBrowserStatus()
  } catch (e) {
    setStatus(e.message || '导入失败', 'error')
  } finally {
    dataImporting.value = false
    event.target.value = ''
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
