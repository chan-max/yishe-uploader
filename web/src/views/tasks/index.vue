<template>
  <div class="tasks-page">
    <div v-if="status.message" :class="['ui', 'message', statusClass]">
      {{ status.message }}
    </div>

    <div class="tasks-toolbar ui segment">
      <div class="toolbar-grid">
        <div class="ui small form">
          <div class="fields compact-fields">
            <div class="field">
              <label>状态</label>
              <select v-model="filters.status" class="ui dropdown">
                <option value="">全部</option>
                <option value="queued">queued</option>
                <option value="running">running</option>
                <option value="success">success</option>
                <option value="failed">failed</option>
              </select>
            </div>
            <div class="field">
              <label>任务类型</label>
              <input v-model.trim="filters.kind" type="text" placeholder="如 publish" />
            </div>
            <div class="field">
              <label>平台</label>
              <input v-model.trim="filters.platform" type="text" placeholder="如 doudian" />
            </div>
            <div class="field">
              <label>来源 ID</label>
              <input v-model.trim="filters.sourceId" type="text" placeholder="source.id" />
            </div>
          </div>
        </div>

        <div class="toolbar-actions">
          <div class="ui small buttons">
            <button type="button" class="ui primary button" :class="{ loading }" :disabled="loading" @click="loadTasks()">
              刷新
            </button>
            <button type="button" class="ui button" @click="toggleAutoRefresh">
              {{ autoRefresh ? '停止轮询' : '自动轮询' }}
            </button>
          </div>
          <div class="toolbar-meta">
            <span>总数 {{ taskList.length }}</span>
            <span>轮询 {{ autoRefresh ? '开启' : '关闭' }}</span>
            <span>间隔 {{ refreshIntervalText }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ui segment task-table-panel">
      <div class="panel-header">
        <h3 class="ui header">当前任务</h3>
      </div>

      <div v-if="!taskList.length && !loading" class="ui placeholder segment empty-state">
        <div class="ui icon header">
          <i class="tasks icon"></i>
          当前没有符合条件的运行任务
        </div>
      </div>

      <div v-else class="table-scroll">
        <table class="ui celled compact striped table task-table">
          <thead>
            <tr>
              <th>状态</th>
              <th>类型</th>
              <th>动作</th>
              <th>平台</th>
              <th>步骤</th>
              <th>来源</th>
              <th>创建时间</th>
              <th>更新时间</th>
              <th>任务 ID</th>
              <th class="action-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in taskList" :key="task.id">
              <td>
                <span :class="['ui', 'tiny', 'label', statusColorClass(task.status)]">{{ task.status }}</span>
              </td>
              <td>{{ task.kind || '-' }}</td>
              <td>{{ task.action || '-' }}</td>
              <td>{{ task.platform || (task.platforms || []).join(', ') || '-' }}</td>
              <td>{{ task.step || '-' }}</td>
              <td class="source-cell" :title="formatSource(task.source)">{{ formatSource(task.source) }}</td>
              <td>{{ formatDateTime(task.createdAt) }}</td>
              <td>{{ formatDateTime(task.updatedAt || task.createdAt) }}</td>
              <td class="task-id-cell" :title="task.id">{{ task.id }}</td>
              <td class="action-col">
                <div class="action-buttons">
                  <button type="button" class="ui tiny primary button" @click="openTaskModal(task.id)">详情</button>
                  <button type="button" class="ui tiny button" @click="openRequestModal(task.id)">载荷</button>
                  <button type="button" class="ui tiny button" @click="openLogsModal(task.id)">日志</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="detailVisible" class="task-modal-mask" @click.self="closeTaskModal">
      <div class="task-modal">
        <div class="task-modal-header">
          <div>
            <h3 class="ui header">任务详情</h3>
            <div class="detail-subtitle">{{ selectedTask?.id || '-' }}</div>
          </div>
          <div class="detail-actions">
            <span v-if="selectedTask" :class="['ui', 'label', statusColorClass(selectedTask.status)]">{{ selectedTask.status }}</span>
            <span v-if="selectedTask" class="ui basic label">{{ selectedTask.step || '-' }}</span>
            <button
              type="button"
              class="ui tiny button"
              :class="{ loading: logsLoading || detailLoading }"
              :disabled="!selectedTaskId || logsLoading || detailLoading"
              @click="refreshCurrentTask"
            >
              刷新
            </button>
            <button type="button" class="ui tiny button" @click="closeTaskModal">关闭</button>
          </div>
        </div>

        <div class="task-modal-body">
          <section class="modal-main">
            <div v-if="selectedTask" class="ui segment detail-segment">
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">类型</span>
                  <span class="summary-value">{{ selectedTask.kind || '-' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">动作</span>
                  <span class="summary-value">{{ selectedTask.action || '-' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">平台</span>
                  <span class="summary-value">{{ selectedTask.platform || (selectedTask.platforms || []).join(', ') || '-' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">来源</span>
                  <span class="summary-value">{{ formatSource(selectedTask.source) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">创建时间</span>
                  <span class="summary-value">{{ formatDateTime(selectedTask.createdAt) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">开始时间</span>
                  <span class="summary-value">{{ formatDateTime(selectedTask.startedAt) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">结束时间</span>
                  <span class="summary-value">{{ formatDateTime(selectedTask.finishedAt) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">最近更新时间</span>
                  <span class="summary-value">{{ formatDateTime(selectedTask.updatedAt) }}</span>
                </div>
              </div>

              <div class="detail-section">
                <h4 class="ui dividing header">元数据</h4>
                <pre class="json-block">{{ prettyJson(selectedTask.metadata) }}</pre>
              </div>

              <div class="detail-section">
                <h4 class="ui dividing header">进度</h4>
                <pre class="json-block">{{ prettyJson(selectedTask.progress) }}</pre>
              </div>

              <div class="detail-section">
                <h4 class="ui dividing header">执行结果</h4>
                <pre class="json-block">{{ prettyJson(selectedTask.result) }}</pre>
              </div>

              <div class="detail-section" v-if="selectedTask.error">
                <h4 class="ui dividing header">错误信息</h4>
                <pre class="json-block error-block">{{ prettyJson(selectedTask.error) }}</pre>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div v-if="requestVisible" class="sub-modal-mask" @click.self="requestVisible = false">
      <div class="sub-modal">
        <div class="sub-modal-header">
          <div>
            <h3 class="ui header">请求载荷</h3>
            <div class="detail-subtitle">{{ selectedTask?.id || '-' }}</div>
          </div>
          <button type="button" class="ui tiny button" @click="requestVisible = false">关闭</button>
        </div>
        <div class="sub-modal-body">
          <pre class="json-block full-height">{{ prettyJson(selectedTask?.request) }}</pre>
        </div>
      </div>
    </div>

    <div v-if="logsVisible" class="sub-modal-mask" @click.self="logsVisible = false">
      <div class="sub-modal">
        <div class="sub-modal-header">
          <div>
            <h3 class="ui header">运行日志</h3>
            <div class="detail-subtitle">{{ selectedTask?.id || '-' }}</div>
          </div>
          <div class="detail-actions">
            <span v-if="selectedLogs.length" class="ui basic label">共 {{ selectedLogs.length }} 条</span>
            <button
              type="button"
              class="ui tiny button"
              :disabled="!selectedTaskId || logsLoading"
              :class="{ loading: logsLoading }"
              @click="loadLogs(selectedTaskId)"
            >
              刷新日志
            </button>
            <button type="button" class="ui tiny button" @click="logsVisible = false">关闭</button>
          </div>
        </div>
        <div class="sub-modal-body">
          <div v-if="!selectedTaskId" class="logs-empty">选择任务后可查看对应日志</div>
          <div v-else-if="!selectedLogs.length && !logsLoading" class="logs-empty">当前没有日志</div>
          <div v-else class="logs-list full-logs">
            <div class="logs-toolbar">
              <div class="ui tiny buttons">
                <button type="button" :class="['ui button', { active: logLevelFilter === 'all' }]" @click="logLevelFilter = 'all'">全部</button>
                <button type="button" :class="['ui button', { active: logLevelFilter === 'info' }]" @click="logLevelFilter = 'info'">Info</button>
                <button type="button" :class="['ui button', { active: logLevelFilter === 'warn' }]" @click="logLevelFilter = 'warn'">Warn</button>
                <button type="button" :class="['ui button', { active: logLevelFilter === 'error' }]" @click="logLevelFilter = 'error'">Error</button>
              </div>
              <span class="logs-toolbar-meta">显示 {{ filteredLogs.length }} / {{ selectedLogs.length }}</span>
            </div>
            <div v-for="log in filteredLogs" :key="log.id" class="log-item compact">
              <div class="log-line">
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span :class="['log-level', `level-${log.level || 'info'}`]">{{ log.level || 'info' }}</span>
                <span class="log-message">{{ log.message }}</span>
                <button
                  v-if="hasLogData(log)"
                  type="button"
                  class="ui mini basic button log-toggle"
                  @click="toggleLogExpanded(log.id)"
                >
                  {{ expandedLogIds.has(log.id) ? '收起' : '数据' }}
                </button>
              </div>
              <pre v-if="hasLogData(log) && expandedLogIds.has(log.id)" class="log-data">{{ prettyJson(log.data) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { getTaskDetail, getTaskList, getTaskLogs } from '@/api/tasks'

const REFRESH_INTERVAL_MS = 3000

const loading = ref(false)
const detailLoading = ref(false)
const logsLoading = ref(false)
const autoRefresh = ref(true)
const detailVisible = ref(false)
const requestVisible = ref(false)
const logsVisible = ref(false)
const logLevelFilter = ref('all')
const taskList = ref([])
const selectedTaskId = ref('')
const selectedTask = ref(null)
const selectedLogs = ref([])
const expandedLogIds = ref(new Set())
const timer = ref(null)
const status = reactive({ message: '', type: 'info' })
const filters = reactive({
  status: '',
  kind: '',
  platform: '',
  sourceId: '',
})

const statusClass = computed(() => {
  if (status.type === 'success') return 'success'
  if (status.type === 'error') return 'error'
  return 'info'
})

const refreshIntervalText = computed(() => `${REFRESH_INTERVAL_MS / 1000}s`)
const filteredLogs = computed(() => {
  if (logLevelFilter.value === 'all') return selectedLogs.value
  return selectedLogs.value.filter((item) => String(item?.level || 'info') === logLevelFilter.value)
})

function setStatus(message = '', type = 'info') {
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

function formatTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleTimeString()
  } catch {
    return String(value)
  }
}

function formatSource(source) {
  if (!source) return '-'
  const parts = [source.system, source.module, source.kind, source.id, source.traceId].filter(Boolean)
  return parts.length ? parts.join(' / ') : '-'
}

function prettyJson(value) {
  if (value === undefined) return '-'
  if (value === null) return 'null'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function statusColorClass(statusValue) {
  if (statusValue === 'success') return 'green'
  if (statusValue === 'failed') return 'red'
  if (statusValue === 'running') return 'blue'
  return 'grey'
}

function hasLogData(log) {
  return log?.data !== undefined && log?.data !== null && !(Array.isArray(log.data) && log.data.length === 0)
}

function toggleLogExpanded(logId) {
  const next = new Set(expandedLogIds.value)
  if (next.has(logId)) next.delete(logId)
  else next.add(logId)
  expandedLogIds.value = next
}

async function loadTasks() {
  loading.value = true
  try {
    const res = await getTaskList({
      status: filters.status || undefined,
      kind: filters.kind || undefined,
      platform: filters.platform || undefined,
      sourceId: filters.sourceId || undefined,
    })
    taskList.value = Array.isArray(res?.data) ? res.data : []

    if (!taskList.value.length) {
      selectedTaskId.value = ''
      selectedTask.value = null
      selectedLogs.value = []
      detailVisible.value = false
      return
    }

    if (detailVisible.value && selectedTaskId.value) {
      const exists = taskList.value.some(item => item.id === selectedTaskId.value)
      if (exists) {
        await refreshCurrentTask()
      }
    }
  } catch (error) {
    console.error('[tasks]', error)
    setStatus(error?.message || '获取任务列表失败', 'error')
  } finally {
    loading.value = false
  }
}

async function loadTaskDetail(taskId) {
  if (!taskId) return
  detailLoading.value = true
  try {
    const res = await getTaskDetail(taskId)
    selectedTask.value = res?.data || null
  } catch (error) {
    console.error('[task-detail]', error)
    setStatus(error?.message || '获取任务详情失败', 'error')
  } finally {
    detailLoading.value = false
  }
}

async function loadLogs(taskId) {
  if (!taskId) return
  logsLoading.value = true
  try {
    const res = await getTaskLogs(taskId)
    selectedLogs.value = Array.isArray(res?.data) ? res.data : []
    expandedLogIds.value = new Set()
  } catch (error) {
    console.error('[task-logs]', error)
    setStatus(error?.message || '获取任务日志失败', 'error')
  } finally {
    logsLoading.value = false
  }
}

async function openTaskModal(taskId) {
  selectedTaskId.value = taskId
  detailVisible.value = true
  await Promise.all([loadTaskDetail(taskId), loadLogs(taskId)])
}

async function openRequestModal(taskId) {
  selectedTaskId.value = taskId
  requestVisible.value = true
  if (!selectedTask.value || selectedTask.value.id !== taskId) {
    await loadTaskDetail(taskId)
  }
}

async function openLogsModal(taskId) {
  selectedTaskId.value = taskId
  logsVisible.value = true
  await loadLogs(taskId)
}

function closeTaskModal() {
  detailVisible.value = false
  requestVisible.value = false
  logsVisible.value = false
}

async function refreshCurrentTask() {
  if (!selectedTaskId.value) return
  await Promise.all([loadTaskDetail(selectedTaskId.value), loadLogs(selectedTaskId.value)])
}

function startAutoRefresh() {
  stopAutoRefresh()
  timer.value = setInterval(() => {
    loadTasks()
  }, REFRESH_INTERVAL_MS)
}

function stopAutoRefresh() {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
    setStatus('任务轮询已开启', 'success')
  } else {
    stopAutoRefresh()
    setStatus('任务轮询已停止', 'info')
  }
}

onMounted(async () => {
  await loadTasks()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style lang="scss" scoped>
.tasks-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tasks-toolbar {
  .toolbar-grid {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }

  .compact-fields {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin: 0;
  }

  .field {
    min-width: 140px;
    margin-bottom: 0;
  }

  .toolbar-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .toolbar-meta {
    display: flex;
    gap: 0.75rem;
    color: #6b7280;
    font-size: 12px;
  }
}

.task-table-panel {
  min-height: calc(100vh - 220px);
  display: flex;
  flex-direction: column;
}

.panel-header,
.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.table-scroll {
  min-height: 0;
  overflow: auto;
}

.task-table {
  table-layout: fixed;
}

.task-table th,
.task-table td {
  vertical-align: middle;
  font-size: 12px;
}

.source-cell,
.task-id-cell {
  font-family: Consolas, Monaco, monospace;
  word-break: break-all;
}

.source-cell {
  max-width: 240px;
}

.task-id-cell {
  max-width: 220px;
}

.action-col {
  width: 190px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex-wrap: wrap;
}

.empty-state,
.logs-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}

.task-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.48);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
}

.task-modal {
  width: 100vw;
  height: 100vh;
  background: #f3f4f6;
  display: flex;
  flex-direction: column;
  box-shadow: none;
}

.task-modal-header {
  padding: 1rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.detail-subtitle {
  color: #6b7280;
  font-size: 12px;
  font-family: Consolas, Monaco, monospace;
  word-break: break-all;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.task-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(360px, 0.75fr);
  gap: 1.25rem;
  padding: 1.25rem 1.5rem 1.5rem;
}

.modal-main,
.modal-side {
  min-height: 0;
  overflow: hidden;
}

.detail-segment,
.side-panel {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
}

.detail-segment {
  padding: 1.15rem;
  overflow-y: auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem 1rem;
  margin: 0.35rem 0 0.9rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.summary-label {
  color: #6b7280;
  font-size: 12px;
}

.summary-value {
  color: #111827;
  font-size: 13px;
  word-break: break-word;
}

.detail-section {
  margin-top: 1.1rem;
}

.json-block,
.log-data {
  margin: 0;
  padding: 0.85rem 0.95rem;
  background: #0f172a;
  color: #dbeafe;
  border-radius: 10px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  font-family: Consolas, Monaco, monospace;
}

.error-block {
  color: #fecaca;
}

.side-hints {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.hint-card {
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 12px;
  padding: 0.85rem 0.95rem;
}

.hint-title {
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.35rem;
}

.hint-text {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}

.logs-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #6b7280;
  font-size: 12px;
}

.logs-list {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  overflow-y: auto;
  min-height: 0;
  flex: 1 1 auto;
  padding-right: 0.25rem;
}

.logs-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.65rem;
  background: #f3f4f6;
}

.logs-toolbar-meta {
  color: #6b7280;
  font-size: 12px;
}

.json-block {
  max-width: 100%;
}

.log-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  background: #fff;
}

.log-item.compact {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.log-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.log-time {
  color: #6b7280;
  font-size: 12px;
  min-width: 64px;
}

.log-level {
  min-width: 46px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.level-info {
  background: #e0f2fe;
  color: #0369a1;
}

.level-warn {
  background: #fef3c7;
  color: #b45309;
}

.level-error {
  background: #fee2e2;
  color: #b91c1c;
}

.log-message {
  color: #111827;
  font-weight: 500;
  flex: 1 1 auto;
  min-width: 240px;
}

.log-data {
  margin-top: 0.5rem;
}

.log-toggle {
  margin-left: auto !important;
}

.sub-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
}

.sub-modal {
  width: min(1200px, 92vw);
  height: min(88vh, 920px);
  background: #f3f4f6;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
}

.sub-modal-header {
  padding: 1rem 1.25rem;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.sub-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 1rem 1.25rem 1.25rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.full-height {
  height: 100%;
}

.full-logs {
  margin-top: 0;
}

@media (max-width: 1200px) {
  .task-modal-body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) 320px;
    padding: 1rem;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .task-modal {
    width: 100vw;
  }

  .sub-modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .task-modal-header {
    padding: 0.9rem 1rem;
    align-items: flex-start;
    flex-direction: column;
  }

  .task-modal-body {
    padding: 0.85rem;
  }

  .sub-modal-header,
  .sub-modal-body {
    padding: 0.85rem 1rem;
  }
}
</style>
