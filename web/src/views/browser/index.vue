<template>
  <div class="browser-page">
    <div v-if="status.message" :class="['ui', 'message', statusTypeClass]">
      {{ status.message }}
    </div>

    <div class="ui segment" style="margin-top: 1rem;">
      <div class="segment-head">
        <div>
          <h3 class="ui dividing header">执行环境管理</h3>
          <div class="ui tiny text muted-text">
            工作目录：{{ profilesState?.workspaceDir || '-' }}
          </div>
          <div class="ui tiny text muted-text">
            环境根目录：{{ profilesState?.profilesRootDir || '-' }}
          </div>
          <div class="ui tiny text muted-text">
            全局状态：{{ browserStatus?.hasInstance ? '已有浏览器实例' : '未连接' }}，默认使用本地 <code>Chrome</code> 并优先绑定当前环境目录
          </div>
        </div>
        <div class="segment-actions">
          <div class="ui checkbox compact-checkbox">
            <input type="checkbox" v-model="browserConfig.headless" id="headless-mode-inline" />
            <label for="headless-mode-inline">连接时使用无头模式</label>
          </div>
          <div class="ui small buttons">
            <button type="button" class="ui button" @click="refreshAll">刷新状态</button>
            <button type="button" class="ui button" @click="refreshProfiles">刷新环境</button>
            <button type="button" class="ui primary button" @click="openCreateProfileForm">新增环境</button>
          </div>
        </div>
      </div>

      <div v-if="profileEditorVisible" class="ui secondary segment profile-editor">
        <div class="ui small form">
          <div class="two fields">
            <div class="field">
              <label>环境编号</label>
              <input
                v-model="profileForm.id"
                type="text"
                :disabled="!!editingProfileId"
                placeholder="例如 001；留空自动生成"
              />
            </div>
            <div class="field">
              <label>环境名称</label>
              <input v-model="profileForm.name" type="text" placeholder="例如 抖音主账号" />
            </div>
          </div>

          <div class="two fields">
            <div class="field">
              <label>账号标识</label>
              <input v-model="profileForm.account" type="text" placeholder="可选" />
            </div>
            <div class="field">
              <label>平台标签</label>
              <input
                v-model="profileForm.platformsText"
                type="text"
                placeholder="多个用逗号分隔，例如 douyin,xiaohongshu"
              />
            </div>
          </div>

          <div class="field">
            <label>备注</label>
            <textarea v-model="profileForm.remark" rows="3" placeholder="可选"></textarea>
          </div>
        </div>

        <div class="ui small buttons">
          <button
            type="button"
            class="ui primary button"
            :class="{ loading: profileSubmitting }"
            :disabled="profileSubmitting"
            @click="submitProfileForm"
          >
            {{ editingProfileId ? '保存环境' : '创建环境' }}
          </button>
          <button type="button" class="ui button" :disabled="profileSubmitting" @click="closeProfileEditor">
            取消
          </button>
        </div>
      </div>

      <table class="ui celled table profile-table">
        <thead>
          <tr>
            <th style="width: 90px;">编号</th>
            <th>名称</th>
            <th>账号</th>
            <th>平台</th>
            <th style="width: 170px;">浏览器状态</th>
            <th style="width: 90px;">页面</th>
            <th>数据目录</th>
            <th>最近使用</th>
            <th style="width: 310px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!profileRows.length">
            <td colspan="9" class="empty-cell">还没有已管理环境，当前仍可直接使用默认目录模式。</td>
          </tr>
          <tr v-for="item in profileRows" :key="item.id">
            <td>{{ item.id }}</td>
            <td>
              <div class="profile-title">
                <strong>{{ item.name || item.id }}</strong>
                <span v-if="item.isActive" class="ui tiny green basic label">当前</span>
                <span v-if="item.instance?.isConnected" class="ui tiny teal basic label">已打开</span>
              </div>
              <div v-if="item.remark" class="muted-text">{{ item.remark }}</div>
            </td>
            <td>{{ item.account || '-' }}</td>
            <td>{{ Array.isArray(item.platforms) && item.platforms.length ? item.platforms.join(', ') : '-' }}</td>
            <td>
              <div class="runtime-state">
                <span class="status-dot" :class="getProfileStatusClass(item)"></span>
                <span>{{ getProfileStatusText(item) }}</span>
              </div>
              <div class="muted-text">
                {{ getProfileStatusHint(item) }}
              </div>
            </td>
            <td>{{ item.instance?.pageCount ?? 0 }}</td>
            <td>
              <div class="path-cell">{{ item.instance?.userDataDir || item.userDataDir || '-' }}</div>
            </td>
            <td>{{ formatDateTime(item.lastUsedAt) }}</td>
            <td>
              <div class="table-actions">
                <button
                  type="button"
                  class="ui primary button"
                  :class="{ loading: browserAction.type === 'connect' && browserAction.profileId === item.id }"
                  :disabled="!!browserAction.type && !(browserAction.type === 'connect' && browserAction.profileId === item.id)"
                  @click="launchAndConnect(item.id)"
                >
                  {{ item.instance?.isConnected ? '重连' : '连接' }}{{ browserConfig.headless ? '（无头）' : '' }}
                </button>
                <button
                  type="button"
                  class="ui button"
                  :class="{ loading: browserAction.type === 'close' && browserAction.profileId === item.id }"
                  :disabled="!item.instance?.hasInstance || (!!browserAction.type && !(browserAction.type === 'close' && browserAction.profileId === item.id))"
                  @click="handleCloseBrowser(item.id)"
                >
                  关闭
                </button>
                <button
                  type="button"
                  class="ui button"
                  :class="{ loading: openingUserDataDirId === item.id }"
                  :disabled="openingUserDataDirId === item.id"
                  @click="handleOpenUserDataDir(item)"
                >
                  目录
                </button>
                <button
                  type="button"
                  class="ui button"
                  :class="{ loading: profileSwitchingId === item.id }"
                  :disabled="item.isActive || profileSwitchingId === item.id"
                  @click="handleSwitchProfile(item.id)"
                >
                  设为默认
                </button>
                <button type="button" class="ui button" @click="openEditProfileForm(item)">编辑</button>
                <button
                  type="button"
                  class="ui red button"
                  :class="{ loading: profileDeletingId === item.id }"
                  :disabled="profileDeletingId === item.id"
                  @click="handleDeleteProfile(item)"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="ui segment" style="margin-top: 1rem;">
      <h3 class="ui dividing header">用户数据管理 (Export)</h3>
      <p class="ui small text" style="color: #666; margin-bottom: 0.75rem;">
        导出当前有效目录下的登录态、Cookie 与缓存数据。当前导出目录：{{ effectiveUserDataDir || '-' }}
      </p>
      <div class="ui small buttons">
        <button
          type="button"
          class="ui olive button"
          :class="{ loading: dataExporting }"
          :disabled="dataExporting"
          @click="exportUserData"
        >
          导出数据文件 (.zip)
        </button>
      </div>
      <div v-if="dataExporting" class="ui tiny warning message">
        提示：该操作会自动关闭已运行的浏览器窗口以确保数据完整，大型目录可能需要几分钟压缩时间。
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  closeBrowser,
  connectBrowser,
  createBrowserProfile,
  deleteBrowserProfile,
  getBrowserStatus,
  listBrowserProfiles,
  openBrowserUserDataDir,
  switchBrowserProfile,
  updateBrowserProfile
} from '../../api/browser'

const browserAction = reactive({
  type: '',
  profileId: ''
})
const dataExporting = ref(false)
const openingUserDataDirId = ref('')
const profileSubmitting = ref(false)
const profileDeletingId = ref('')
const profileSwitchingId = ref('')
const profileEditorVisible = ref(false)
const editingProfileId = ref('')
const browserStatus = ref(null)
const profilesState = ref({
  activeProfileId: null,
  workspaceDir: '',
  profilesRootDir: '',
  items: []
})
const status = reactive({ message: '', type: 'info' })

const browserConfig = reactive({
  headless: false,
  profileId: ''
})

const profileForm = reactive({
  id: '',
  name: '',
  remark: '',
  account: '',
  platformsText: ''
})

const profileItems = computed(() => Array.isArray(profilesState.value?.items) ? profilesState.value.items : [])
const profileInstanceMap = computed(() => {
  const instances = Array.isArray(browserStatus.value?.instances) ? browserStatus.value.instances : []
  const map = new Map(
    instances
      .map((item) => [String(item?.profileId || '').trim(), item])
      .filter(([profileId]) => !!profileId)
  )

  const connection = browserStatus.value?.connection || null
  const fallbackProfileId = String(connection?.profileId || connection?.activeProfileId || '').trim()
  if (fallbackProfileId && !map.has(fallbackProfileId)) {
    map.set(fallbackProfileId, {
      profileId: fallbackProfileId,
      hasInstance: !!browserStatus.value?.hasInstance,
      isConnected: !!browserStatus.value?.isConnected,
      connecting: !!browserStatus.value?.connecting,
      pageCount: Number(browserStatus.value?.pageCount || 0),
      lastActivity: browserStatus.value?.lastActivity || null,
      lastError: browserStatus.value?.lastError || null,
      browserVersion: connection?.browserVersion || '',
      connection
    })
  }

  return map
})
const profileRows = computed(() =>
  profileItems.value.map((item) => ({
    ...item,
    instance: profileInstanceMap.value.get(String(item.id || '').trim()) || null
  }))
)

const selectedProfile = computed(() => {
  const selectedId = String(browserConfig.profileId || '').trim()
  return profileRows.value.find((item) => item.id === selectedId) || null
})

const effectiveUserDataDir = computed(() => {
  return (
    selectedProfile.value?.instance?.userDataDir ||
    selectedProfile.value?.userDataDir ||
    browserStatus.value?.connection?.userDataDir ||
    ''
  )
})

const statusTypeClass = computed(() => {
  if (status.type === 'success') return 'success'
  if (status.type === 'error') return 'error'
  return 'info'
})

function setStatus(message, type = 'info') {
  status.message = message
  status.type = type
}

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function getProfileStatusClass(profile) {
  if (profile?.instance?.connecting) return 'pending'
  if (profile?.instance?.isConnected) return 'ok'
  if (profile?.instance?.lastError) return 'fail'
  return 'idle'
}

function getProfileStatusText(profile) {
  if (profile?.instance?.connecting) return '连接中'
  if (profile?.instance?.isConnected) return '已连接'
  if (profile?.instance?.hasInstance) return '已启动'
  return '未连接'
}

function getProfileStatusHint(profile) {
  const instance = profile?.instance
  if (!instance) {
    return profile?.browserVersion ? `最近版本：${profile.browserVersion}` : '浏览器窗口未打开'
  }
  if (instance.lastError) {
    return instance.lastError
  }
  if (instance.isConnected) {
    const versionText = instance.browserVersion || profile?.browserVersion || '未知版本'
    const browserName = String(instance.connection?.browserName || '').trim().toLowerCase()
    const browserLabel = browserName === 'chromium' ? 'Chromium' : 'Chrome'
    return `${browserLabel} ${versionText}`
  }
  if (instance.connecting) {
    return '正在建立浏览器上下文'
  }
  return instance.browserVersion || profile?.browserVersion || '浏览器窗口未打开'
}

function normalizeProfileSelection() {
  const selectedId = String(browserConfig.profileId || '').trim()
  const exists = profileItems.value.some((item) => item.id === selectedId)
  if (selectedId && exists) {
      return
  }

  const activeId = String(
    browserStatus.value?.connection?.activeProfileId ||
    profilesState.value?.activeProfileId ||
    ''
  ).trim()
  browserConfig.profileId = activeId || (profileItems.value[0]?.id || '')
}

async function refreshProfiles() {
  const data = await listBrowserProfiles()
  if (!data?.success) {
    throw new Error(data?.message || '获取环境列表失败')
  }

  profilesState.value = {
    activeProfileId: data.data?.activeProfileId || null,
    workspaceDir: data.data?.workspaceDir || '',
    profilesRootDir: data.data?.profilesRootDir || '',
    items: Array.isArray(data.data?.items) ? data.data.items : []
  }

  normalizeProfileSelection()
}

async function refreshBrowserStatus() {
  const data = await getBrowserStatus()
  if (!data?.success) {
    throw new Error(data?.message || '获取状态失败')
  }
  browserStatus.value = data.data || null
  normalizeProfileSelection()
}

async function refreshAll(silent = false) {
  try {
    await Promise.all([refreshBrowserStatus(), refreshProfiles()])
  } catch (error) {
    console.error('[browser-refresh]', error)
    if (!silent) {
      setStatus(error.message || '刷新浏览器状态失败', 'error')
    }
  }
}

async function launchAndConnect(profileId = browserConfig.profileId) {
  const normalizedProfileId = String(profileId || '').trim()
  browserAction.type = 'connect'
  browserAction.profileId = normalizedProfileId
  if (normalizedProfileId) {
    browserConfig.profileId = normalizedProfileId
  }
  setStatus('正在启动本地 Chrome 并连接...', 'info')
  try {
    const data = await connectBrowser({
      mode: 'persistent',
      profileId: normalizedProfileId || undefined,
      headless: browserConfig.headless
    })
    if (!data?.success) {
      throw new Error(data?.message || '连接失败')
    }
    browserStatus.value = data.data || null
    await refreshProfiles()
    setStatus(
      `本地 Chrome 已连接${browserConfig.headless ? '（无头）' : ''}${normalizedProfileId ? `，环境 ${normalizedProfileId}` : ''}`,
      'success'
    )
  } catch (error) {
    setStatus(error?.message || '启动并连接失败', 'error')
  } finally {
    browserAction.type = ''
    browserAction.profileId = ''
  }
}

async function handleCloseBrowser(profileId = browserConfig.profileId) {
  const normalizedProfileId = String(profileId || '').trim()
  browserAction.type = 'close'
  browserAction.profileId = normalizedProfileId
  setStatus('正在断开浏览器...', 'info')
  try {
    const data = await closeBrowser(normalizedProfileId || undefined)
    if (!data?.success) {
      throw new Error(data?.message || '断开失败')
    }
    browserStatus.value = data.data || null
    await refreshProfiles()
    setStatus(normalizedProfileId ? `环境 ${normalizedProfileId} 的浏览器已断开` : '浏览器已断开', 'success')
  } catch (error) {
    setStatus(error?.message || '断开浏览器失败', 'error')
  } finally {
    browserAction.type = ''
    browserAction.profileId = ''
  }
}

function resetProfileForm() {
  editingProfileId.value = ''
  profileForm.id = ''
  profileForm.name = ''
  profileForm.remark = ''
  profileForm.account = ''
  profileForm.platformsText = ''
}

function closeProfileEditor() {
  resetProfileForm()
  profileEditorVisible.value = false
}

function openCreateProfileForm() {
  resetProfileForm()
  profileEditorVisible.value = true
}

function openEditProfileForm(profile) {
  resetProfileForm()
  editingProfileId.value = profile.id
  profileEditorVisible.value = true
  profileForm.id = profile.id || ''
  profileForm.name = profile.name || ''
  profileForm.remark = profile.remark || ''
  profileForm.account = profile.account || ''
  profileForm.platformsText = Array.isArray(profile.platforms) ? profile.platforms.join(', ') : ''
}

async function submitProfileForm() {
  profileSubmitting.value = true
  try {
    const isEditing = !!editingProfileId.value
    const payload = {
      id: isEditing ? undefined : (profileForm.id || '').trim() || undefined,
      name: (profileForm.name || '').trim() || undefined,
      remark: (profileForm.remark || '').trim() || undefined,
      account: (profileForm.account || '').trim() || undefined,
      platforms: (profileForm.platformsText || '')
        .split(/[,，\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    }

    if (!payload.name && !isEditing) {
      throw new Error('请填写环境名称')
    }

    const data = isEditing
      ? await updateBrowserProfile(editingProfileId.value, payload)
      : await createBrowserProfile(payload)

    if (!data?.success) {
      throw new Error(data?.message || (isEditing ? '更新环境失败' : '创建环境失败'))
    }

    await refreshAll(true)
    if (data.data?.id) {
      browserConfig.profileId = data.data.id
    }
    closeProfileEditor()
    setStatus(isEditing ? '环境已更新' : '环境已创建', 'success')
  } catch (error) {
    setStatus(error?.message || '保存环境失败', 'error')
  } finally {
    profileSubmitting.value = false
  }
}

async function handleSwitchProfile(profileId) {
  profileSwitchingId.value = profileId
  try {
    const data = await switchBrowserProfile(profileId)
    if (!data?.success) {
      throw new Error(data?.message || '切换环境失败')
    }
    browserConfig.profileId = profileId
    await refreshAll(true)
    setStatus(`环境 ${profileId} 已切换`, 'success')
  } catch (error) {
    setStatus(error?.message || '切换环境失败', 'error')
  } finally {
    profileSwitchingId.value = ''
  }
}

async function handleDeleteProfile(profile) {
  if (!window.confirm(`确认删除环境 ${profile.id} 吗？会同时删除该环境的缓存目录。`)) {
    return
  }

  profileDeletingId.value = profile.id
  try {
    const data = await deleteBrowserProfile(profile.id)
    if (!data?.success) {
      throw new Error(data?.message || '删除环境失败')
    }
    if (browserConfig.profileId === profile.id) {
      browserConfig.profileId = ''
    }
    await refreshAll(true)
    setStatus(`环境 ${profile.id} 已删除`, 'success')
  } catch (error) {
    setStatus(error?.message || '删除环境失败', 'error')
  } finally {
    profileDeletingId.value = ''
  }
}

async function exportUserData() {
  const userDataDir = effectiveUserDataDir.value
  if (!userDataDir) {
    setStatus('当前没有可导出的用户数据目录', 'error')
    return
  }

  dataExporting.value = true
  setStatus('正在压缩并准备导出数据，大型目录可能需要较长时间，请稍候...', 'info')
  try {
    const url = `/api/browser/export-user-data?userDataDir=${encodeURIComponent(userDataDir)}`
    window.location.href = url
    setStatus('数据导出连接已建立，请在下载完成后查看', 'success')
    setTimeout(() => {
      dataExporting.value = false
    }, 5000)
  } catch (error) {
    dataExporting.value = false
    setStatus(error?.message || '导出失败', 'error')
  }
}

async function handleOpenUserDataDir(profile = null) {
  const targetProfile = profile || selectedProfile.value
  const dirPath = targetProfile?.instance?.userDataDir || targetProfile?.userDataDir || ''
  if (!dirPath) {
    setStatus('当前没有可打开的目录路径', 'error')
    return
  }

  openingUserDataDirId.value = String(targetProfile?.id || '')
  try {
    const data = await openBrowserUserDataDir(dirPath, true)
    if (!data?.success) {
      throw new Error(data?.message || '打开目录失败')
    }
    setStatus(`目录已打开：${dirPath}`, 'success')
  } catch (error) {
    setStatus(error?.message || '打开目录失败', 'error')
  } finally {
    openingUserDataDirId.value = ''
  }
}

let pollTimer = null

onMounted(async () => {
  await refreshAll(true)
  pollTimer = setInterval(() => {
    refreshAll(true)
  }, 5000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }
})
</script>

<style lang="scss" scoped>
.browser-page {
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #999;

    &.ok {
      background: #21ba45;
    }

    &.fail {
      background: #db2828;
    }

    &.pending {
      background: #f2c037;
    }

    &.idle {
      background: #9e9e9e;
    }
  }

  .segment-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .profile-editor {
    margin-bottom: 1rem;
  }

  .profile-table {
    width: 100%;
  }

  .profile-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .muted-text {
    color: #666;
    word-break: break-all;
  }

  .empty-cell {
    color: #666;
    text-align: center;
  }

  .segment-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .compact-checkbox {
    margin: 0;
    white-space: nowrap;
  }

  .runtime-state {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .path-cell {
    max-width: 360px;
    word-break: break-all;
    color: #666;
    font-size: 0.92em;
  }

  .table-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  @media (max-width: 1280px) {
    .segment-head {
      flex-direction: column;
    }

    .segment-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>
