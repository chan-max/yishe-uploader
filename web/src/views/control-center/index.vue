<template>
  <div class="control-center-page">
    <div v-if="status.message" :class="['ui', 'message', statusClass]">
      {{ status.message }}
    </div>

    <div class="ui segment hero-panel">
      <div>
        <h2 class="ui header">
          <i class="sliders horizontal icon"></i>
          <div class="content">
            集中操作台
            <div class="sub header">admin 端统一管理电商采集和浏览器工具集，服务端继续负责目录下发与执行转发。</div>
          </div>
        </h2>
        <div class="hero-meta">
          当前页面优先走 schema 驱动：电商采集来自 capability，工具集来自 registry，后续新增能力时优先补后端定义，不在前端散落硬编码。
        </div>
      </div>
      <button
        type="button"
        class="ui button"
        :class="{ loading: collectLoading || smallFeatureLoading }"
        :disabled="collectLoading || smallFeatureLoading || collectRunning || smallFeatureRunning"
        @click="refreshAll"
      >
        刷新目录
      </button>
    </div>

    <div class="ui top attached tabular menu">
      <a class="item" :class="{ active: activeTab === 'collect' }" @click="activeTab = 'collect'">电商采集</a>
      <a class="item" :class="{ active: activeTab === 'small-feature' }" @click="activeTab = 'small-feature'">工具集</a>
    </div>

    <div class="ui bottom attached segment tab-panel">
      <template v-if="activeTab === 'collect'">
        <div class="tab-intro">
          <div>
            <div class="tab-title">电商采集任务</div>
            <div class="tab-desc">平台和任务类型都来自 `/api/ecom-collect/capabilities`，前端只负责展示、校验和提交。</div>
          </div>
          <div class="tab-stats">
            <span class="ui tiny basic label">平台 {{ collectPlatforms.length }}</span>
            <span class="ui tiny basic label">任务类型 {{ collectTaskTypeCount }}</span>
          </div>
        </div>

        <div class="workspace-grid">
          <aside class="catalog-panel">
            <div class="panel-title">平台目录</div>
            <div v-if="collectLoading" class="ui active inline loader small"></div>
            <div v-else-if="!collectPlatforms.length" class="ui tiny message">暂时没有可用的平台目录。</div>
            <div v-else class="catalog-list">
              <button
                v-for="platform in collectPlatforms"
                :key="platform.value"
                type="button"
                class="catalog-card"
                :class="{ active: selectedCollectPlatformKey === platform.value }"
                @click="selectedCollectPlatformKey = platform.value"
              >
                <div class="catalog-card-head">
                  <strong>{{ platform.label }}</strong>
                  <span class="ui tiny basic label" :class="platform.runnable === false ? '' : 'green'">{{ platform.statusLabel || platform.status }}</span>
                </div>
                <div class="catalog-card-meta">场景 {{ platform.supportedScenes?.length || 0 }} · 任务类型 {{ platform.taskTypes?.length || 0 }}</div>
                <div v-if="platform.reason" class="catalog-card-reason">{{ platform.reason }}</div>
              </button>
            </div>
          </aside>

          <section class="detail-panel">
            <div class="ui segment detail-card">
              <div v-if="selectedCollectPlatform">
                <div class="detail-head">
                  <div>
                    <div class="detail-title">{{ selectedCollectPlatform.label }}</div>
                    <div class="detail-subtitle">{{ selectedCollectPlatform.docs?.overview || '当前平台已接入统一能力定义。' }}</div>
                  </div>
                  <div class="detail-labels">
                    <span class="ui tiny basic label">{{ selectedCollectPlatform.statusLabel || selectedCollectPlatform.status }}</span>
                    <span v-for="region in selectedCollectPlatform.regions || []" :key="region" class="ui tiny basic label">{{ region }}</span>
                  </div>
                </div>

                <div class="field task-type-field">
                  <label>任务类型</label>
                  <select v-model="selectedCollectTaskTypeKey" class="ui dropdown">
                    <option value="">请选择任务类型</option>
                    <option v-for="taskType in selectedCollectPlatform.taskTypes || []" :key="taskType.value" :value="taskType.value">
                      {{ taskType.label }}
                    </option>
                  </select>
                </div>

                <template v-if="selectedCollectTaskType">
                  <div class="ui info message compact-message">
                    <div class="header">{{ selectedCollectTaskType.label }}</div>
                    <p>{{ selectedCollectTaskType.description || '该任务类型已接入统一执行入口。' }}</p>
                  </div>

                  <div v-if="selectedCollectTaskType.docs?.examples?.length" class="example-strip">
                    <span class="example-strip-label">示例填充</span>
                    <button
                      v-for="example in selectedCollectTaskType.docs.examples"
                      :key="example.title"
                      type="button"
                      class="ui tiny button"
                      @click="applyCollectExample(example)"
                    >
                      {{ example.title }}
                    </button>
                  </div>

                  <div class="ui small form">
                    <SchemaField
                      v-for="field in normalizedCollectFields"
                      :key="field.key"
                      v-model="collectFormState[field.key]"
                      :field="field"
                      :error="collectFormErrors[field.key] || ''"
                      id-prefix="collect"
                      @blur="validateCollectField(field)"
                    />

                    <div class="action-row">
                      <button
                        type="button"
                        class="ui primary button"
                        :class="{ loading: collectRunning }"
                        :disabled="collectRunning || !selectedCollectTaskType"
                        @click="runCollectAction"
                      >
                        执行采集任务
                      </button>
                    </div>
                  </div>
                </template>

                <div v-else class="ui tiny message">请选择任务类型后再填写参数。</div>
              </div>

              <div v-else class="ui tiny message">暂无可用平台，请先刷新目录。</div>
            </div>

            <div class="ui segment result-panel">
              <div class="result-head">
                <div>
                  <div class="panel-title">执行结果</div>
                  <div class="panel-subtitle">保留服务端原始返回结构，方便继续做转发、入库和链路对接。</div>
                </div>
                <div v-if="collectResultSummary" class="result-summary">
                  <span class="ui tiny basic label">状态 {{ collectResultSummary.status }}</span>
                  <span class="ui tiny basic label">记录 {{ collectResultSummary.records }}</span>
                  <span class="ui tiny basic label">截图 {{ collectResultSummary.snapshots }}</span>
                </div>
              </div>
              <pre class="result-output">{{ collectResultText || '执行后结果会显示在这里。' }}</pre>
            </div>
          </section>
        </div>
      </template>

      <template v-else>
        <div class="tab-intro">
          <div>
            <div class="tab-title">浏览器工具集</div>
            <div class="tab-desc">功能目录来自 `/api/browser/small-features`。这里是 admin 端统一入口，不再把交互散在调试页里。</div>
          </div>
          <div class="tab-stats">
            <span class="ui tiny basic label">功能 {{ smallFeatures.length }}</span>
          </div>
        </div>

        <div class="workspace-grid">
          <aside class="catalog-panel">
            <div class="panel-title">功能目录</div>
            <div v-if="smallFeatureLoading" class="ui active inline loader small"></div>
            <div v-else-if="!smallFeatures.length" class="ui tiny message">暂时没有可用的工具。</div>
            <div v-else class="catalog-list">
              <button
                v-for="feature in smallFeatures"
                :key="feature.key"
                type="button"
                class="catalog-card"
                :class="{ active: selectedSmallFeatureKey === feature.key }"
                @click="selectedSmallFeatureKey = feature.key"
              >
                <div class="catalog-card-head">
                  <strong>{{ feature.name }}</strong>
                  <span class="ui tiny orange basic label">{{ feature.category }}</span>
                </div>
                <div class="catalog-card-meta">{{ feature.platform }}</div>
                <div class="catalog-card-desc">{{ feature.description }}</div>
              </button>
            </div>
          </aside>

          <section class="detail-panel">
            <div class="ui segment detail-card">
              <div v-if="selectedSmallFeature">
                <div class="detail-head">
                  <div>
                    <div class="detail-title">{{ selectedSmallFeature.name }}</div>
                    <div class="detail-subtitle">{{ selectedSmallFeature.description }}</div>
                  </div>
                  <div class="detail-labels">
                    <span class="ui tiny basic label">{{ selectedSmallFeature.platform }}</span>
                    <span class="ui tiny orange basic label">{{ selectedSmallFeature.category }}</span>
                  </div>
                </div>

                <div v-if="selectedSmallFeature.tips?.length" class="ui info message compact-message">
                  <div class="header">使用提示</div>
                  <p v-for="tip in selectedSmallFeature.tips" :key="tip">{{ tip }}</p>
                </div>

                <div class="ui small form">
                  <SchemaField
                    v-for="field in normalizedSmallFeatureFields"
                    :key="field.key"
                    v-model="smallFeatureFormState[field.key]"
                    :field="field"
                    :error="smallFeatureFormErrors[field.key] || ''"
                    id-prefix="small-feature"
                    @blur="validateSmallFeatureField(field)"
                  />

                  <div class="action-row">
                    <button
                      type="button"
                      class="ui primary button"
                      :class="{ loading: smallFeatureRunning }"
                      :disabled="smallFeatureRunning || !selectedSmallFeature"
                      @click="runSmallFeatureAction"
                    >
                      执行工具
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="ui tiny message">暂无可用工具，请先刷新目录。</div>
            </div>

            <div class="ui segment result-panel">
              <div class="result-head">
                <div>
                  <div class="panel-title">执行结果</div>
                  <div class="panel-subtitle">保留原始返回，方便你后续继续串服务端和客户端逻辑。</div>
                </div>
                <div v-if="smallFeatureResultSummary" class="result-summary">
                  <span class="ui tiny basic label">状态 {{ smallFeatureResultSummary.status }}</span>
                  <span class="ui tiny basic label">功能 {{ smallFeatureResultSummary.featureKey }}</span>
                </div>
              </div>
              <pre class="result-output">{{ smallFeatureResultText || '执行后结果会显示在这里。' }}</pre>
            </div>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { getBrowserSmallFeatures, runBrowserSmallFeature } from '@/api/browser'
import { getEcomCollectCapabilities, runEcomCollectTask } from '@/api/ecomCollect'
import SchemaField from '@/components/control-center/SchemaField.vue'

const activeTab = ref('collect')
const status = reactive({ message: '', type: 'info' })
const collectLoading = ref(false)
const collectRunning = ref(false)
const collectPlatforms = ref([])
const selectedCollectPlatformKey = ref('')
const selectedCollectTaskTypeKey = ref('')
const collectFormState = reactive({})
const collectFormErrors = reactive({})
const collectResult = ref(null)
const collectResultText = ref('')
const smallFeatureLoading = ref(false)
const smallFeatureRunning = ref(false)
const smallFeatures = ref([])
const selectedSmallFeatureKey = ref('')
const smallFeatureFormState = reactive({})
const smallFeatureFormErrors = reactive({})
const smallFeatureResult = ref(null)
const smallFeatureResultText = ref('')

const statusClass = computed(() => status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : 'info')
const selectedCollectPlatform = computed(() => collectPlatforms.value.find((item) => item.value === selectedCollectPlatformKey.value) || null)
const selectedCollectTaskType = computed(() => (selectedCollectPlatform.value?.taskTypes || []).find((item) => item.value === selectedCollectTaskTypeKey.value) || null)
const normalizedCollectFields = computed(() => normalizeSchemaFields(selectedCollectTaskType.value?.fields || []))
const collectTaskTypeCount = computed(() => collectPlatforms.value.reduce((sum, item) => sum + ((item?.taskTypes || []).length || 0), 0))
const collectResultSummary = computed(() => !collectResult.value ? null : ({ status: collectResult.value.status || (collectResult.value.success ? 'success' : 'failed'), records: collectResult.value?.data?.records?.length || 0, snapshots: collectResult.value?.data?.snapshots?.length || 0 }))
const selectedSmallFeature = computed(() => smallFeatures.value.find((item) => item.key === selectedSmallFeatureKey.value) || null)
const normalizedSmallFeatureFields = computed(() => normalizeSmallFeatureFields(selectedSmallFeature.value))
const smallFeatureResultSummary = computed(() => !smallFeatureResult.value ? null : ({ status: smallFeatureResult.value.success === false ? 'failed' : 'success', featureKey: smallFeatureResult.value?.data?.featureKey || selectedSmallFeatureKey.value || '-' }))

function setStatus(message, type = 'info') { status.message = message; status.type = type }
function resetReactiveObject(target, nextValue = {}) { Object.keys(target).forEach((key) => delete target[key]); Object.entries(nextValue).forEach(([key, value]) => { target[key] = value }) }
function normalizeSchemaFields(fields = []) { return (Array.isArray(fields) ? fields : []).map((field) => ({ ...field, component: String(field?.component || 'input').trim() || 'input' })) }
function normalizeSmallFeatureFields(feature) { return (feature?.fields || []).map((field) => { const type = String(field?.type || 'text').trim() || 'text'; return { ...field, component: type === 'boolean' ? 'switch' : type === 'password' ? 'password' : 'input', inputType: type === 'password' ? 'password' : 'text' } }) }
function buildDefaultState(fields = []) { const nextState = {}; fields.forEach((field) => { const key = String(field?.key || '').trim(); if (!key) return; if (field.component === 'switch') { nextState[key] = field.defaultValue !== undefined ? !!field.defaultValue : false; return } if (field.component === 'array-text') { nextState[key] = Array.isArray(field.defaultValue) ? field.defaultValue.join('\n') : (typeof field.defaultValue === 'string' ? field.defaultValue : ''); return } nextState[key] = field.defaultValue ?? '' }); return nextState }
function isMissingFieldValue(field, value) { if (field.component === 'switch') return value === undefined || value === null; if (field.component === 'input-number') return value === '' || value === undefined || value === null; return !String(value || '').trim() }
function validateDynamicField(field, state, errors) { const key = String(field?.key || '').trim(); if (!key) return true; if (field.required && isMissingFieldValue(field, state[key])) { errors[key] = `请填写${field.label || key}`; return false } if (field.component === 'input-number' && state[key] !== '' && state[key] !== undefined && state[key] !== null && Number.isNaN(Number(state[key]))) { errors[key] = `${field.label || key}需要是数字`; return false } if (field.component === 'url' && String(state[key] || '').trim() && !/^https?:\/\//i.test(String(state[key] || '').trim())) { errors[key] = `${field.label || key}需要以 http:// 或 https:// 开头`; return false } errors[key] = ''; return true }
function validateDynamicForm(fields, state, errors) { let valid = true; fields.forEach((field) => { if (!validateDynamicField(field, state, errors)) valid = false }); return valid }
function buildDynamicPayload(fields, state) { const payload = {}; fields.forEach((field) => { const key = String(field?.key || '').trim(); if (!key) return; const rawValue = state[key]; if (field.component === 'switch') { payload[key] = !!rawValue; return } if (field.component === 'input-number') { if (rawValue === '' || rawValue === undefined || rawValue === null) return; payload[key] = Number(rawValue); return } if (field.component === 'array-text') { const items = String(rawValue || '').split(/\r?\n|,|，/).map((item) => item.trim()).filter(Boolean); if (items.length) payload[key] = items; return } const normalized = String(rawValue || '').trim(); if (normalized) payload[key] = normalized }); return payload }
function syncSelectedCollectPlatform() { if (!collectPlatforms.value.length) { selectedCollectPlatformKey.value = ''; return } if (!collectPlatforms.value.some((item) => item.value === selectedCollectPlatformKey.value)) selectedCollectPlatformKey.value = collectPlatforms.value.find((item) => item.runnable !== false)?.value || collectPlatforms.value[0]?.value || '' }
function syncSelectedCollectTaskType() { const taskTypes = selectedCollectPlatform.value?.taskTypes || []; if (!taskTypes.length) { selectedCollectTaskTypeKey.value = ''; return } if (!taskTypes.some((item) => item.value === selectedCollectTaskTypeKey.value)) selectedCollectTaskTypeKey.value = taskTypes.find((item) => item.runnable !== false)?.value || taskTypes[0]?.value || '' }
function syncSelectedSmallFeature() { if (!smallFeatures.value.length) { selectedSmallFeatureKey.value = ''; return } if (!smallFeatures.value.some((item) => item.key === selectedSmallFeatureKey.value)) selectedSmallFeatureKey.value = smallFeatures.value[0]?.key || '' }
function initializeCollectFormState() { resetReactiveObject(collectFormState, buildDefaultState(normalizedCollectFields.value)); resetReactiveObject(collectFormErrors, {}) }
function initializeSmallFeatureFormState() { resetReactiveObject(smallFeatureFormState, buildDefaultState(normalizedSmallFeatureFields.value)); resetReactiveObject(smallFeatureFormErrors, {}) }
function validateCollectField(field) { validateDynamicField(field, collectFormState, collectFormErrors) }
function validateSmallFeatureField(field) { validateDynamicField(field, smallFeatureFormState, smallFeatureFormErrors) }

async function loadCollectCapabilities(silent = false) {
  collectLoading.value = true
  try {
    const response = await getEcomCollectCapabilities()
    collectPlatforms.value = Array.isArray(response?.data?.platforms) ? response.data.platforms : []
    syncSelectedCollectPlatform()
    syncSelectedCollectTaskType()
    if (!silent) setStatus('电商采集能力目录已刷新', 'success')
  } catch (error) {
    collectPlatforms.value = []
    if (!silent) setStatus(error?.response?.data?.message || error.message || '获取电商采集能力失败', 'error')
  } finally {
    collectLoading.value = false
  }
}

async function loadSmallFeatures(silent = false) {
  smallFeatureLoading.value = true
  try {
    const response = await getBrowserSmallFeatures()
    smallFeatures.value = Array.isArray(response?.data) ? response.data : []
    syncSelectedSmallFeature()
    if (!silent) setStatus('工具目录已刷新', 'success')
  } catch (error) {
    smallFeatures.value = []
    if (!silent) setStatus(error?.response?.data?.message || error.message || '获取工具目录失败', 'error')
  } finally {
    smallFeatureLoading.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadCollectCapabilities(true), loadSmallFeatures(true)])
  setStatus('集中操作台目录已刷新', 'success')
}

async function applyCollectExample(example) {
  const payload = example?.payload && typeof example.payload === 'object' ? example.payload : {}
  const platform = String(payload.platform || selectedCollectPlatformKey.value || '').trim()
  const taskType = String(payload.taskType || '').trim()
  if (platform) selectedCollectPlatformKey.value = platform
  await nextTick()
  if (taskType) selectedCollectTaskTypeKey.value = taskType
  await nextTick()
  const nextState = buildDefaultState(normalizedCollectFields.value)
  const configData = payload?.configData && typeof payload.configData === 'object' ? payload.configData : {}
  normalizedCollectFields.value.forEach((field) => {
    const value = configData[field.key]
    if (value === undefined || value === null) return
    nextState[field.key] = field.component === 'array-text' && Array.isArray(value) ? value.join('\n') : value
  })
  resetReactiveObject(collectFormState, nextState)
  resetReactiveObject(collectFormErrors, {})
  setStatus(`已填充示例：${example?.title || '未命名示例'}`, 'success')
}

async function runCollectAction() {
  if (!selectedCollectPlatform.value || !selectedCollectTaskType.value) { setStatus('请先选择平台和任务类型', 'error'); return }
  if (!validateDynamicForm(normalizedCollectFields.value, collectFormState, collectFormErrors)) { setStatus('请先完善采集任务参数', 'error'); return }
  collectRunning.value = true
  try {
    const payload = { platform: selectedCollectPlatform.value.value, taskType: selectedCollectTaskType.value.value, collectScene: selectedCollectTaskType.value.collectScene, configData: buildDynamicPayload(normalizedCollectFields.value, collectFormState) }
    const response = await runEcomCollectTask(payload)
    collectResult.value = response
    collectResultText.value = JSON.stringify(response, null, 2)
    setStatus(response?.message || '采集任务执行完成', response?.success === false ? 'error' : 'success')
  } catch (error) {
    setStatus(error?.response?.data?.message || error.message || '执行采集任务失败', 'error')
  } finally {
    collectRunning.value = false
  }
}

async function runSmallFeatureAction() {
  if (!selectedSmallFeature.value) { setStatus('请先选择要执行的工具', 'error'); return }
  if (!validateDynamicForm(normalizedSmallFeatureFields.value, smallFeatureFormState, smallFeatureFormErrors)) { setStatus('请先完善工具参数', 'error'); return }
  smallFeatureRunning.value = true
  try {
    const response = await runBrowserSmallFeature(selectedSmallFeature.value.key, buildDynamicPayload(normalizedSmallFeatureFields.value, smallFeatureFormState))
    smallFeatureResult.value = response
    smallFeatureResultText.value = JSON.stringify(response, null, 2)
    setStatus(response?.message || '工具执行完成', response?.success === false ? 'error' : 'success')
  } catch (error) {
    setStatus(error?.response?.data?.message || error.message || '执行工具失败', 'error')
  } finally {
    smallFeatureRunning.value = false
  }
}

watch(() => selectedCollectPlatformKey.value, () => syncSelectedCollectTaskType())
watch(() => selectedCollectTaskTypeKey.value, () => initializeCollectFormState())
watch(() => selectedSmallFeatureKey.value, () => initializeSmallFeatureFormState())
onMounted(async () => { await refreshAll() })
</script>

<style lang="scss" scoped>
.control-center-page { display: flex; flex-direction: column; gap: 1rem; padding-bottom: 1rem; }
.hero-panel, .tab-intro, .detail-head, .result-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
.hero-meta, .tab-desc, .detail-subtitle, .panel-subtitle { color: #666; line-height: 1.6; }
.hero-meta, .tab-desc, .detail-subtitle { margin-top: 0.35rem; }
.tab-panel { border-top: none !important; }
.tab-title, .detail-title, .panel-title { font-weight: 700; color: #1b1c1d; }
.tab-title, .detail-title { font-size: 1rem; }
.workspace-grid { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 1rem; }
.catalog-list, .detail-panel { display: flex; flex-direction: column; gap: 0.75rem; }
.catalog-list { max-height: 920px; overflow-y: auto; padding-right: 0.15rem; }
.catalog-card { width: 100%; text-align: left; border: 1px solid #dcdfe6; background: #fff; border-radius: 10px; padding: 0.85rem 0.9rem; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
.catalog-card:hover { border-color: #8fb9ff; box-shadow: 0 8px 18px rgba(33, 133, 208, 0.08); }
.catalog-card.active { border-color: #2185d0; box-shadow: 0 10px 22px rgba(33, 133, 208, 0.14); transform: translateY(-1px); }
.catalog-card-head, .detail-labels, .result-summary, .tab-stats { display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
.catalog-card-meta, .catalog-card-desc, .catalog-card-reason { margin-top: 0.45rem; color: #666; line-height: 1.5; font-size: 0.86rem; }
.catalog-card-reason { color: #9f3a38; }
.task-type-field { margin-bottom: 1rem; }
.compact-message { margin-bottom: 1rem !important; }
.example-strip { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; margin-bottom: 1rem; }
.example-strip-label { color: #666; font-size: 0.86rem; font-weight: 600; }
.action-row { margin-top: 1rem; display: flex; justify-content: flex-start; }
.result-output { margin: 0; padding: 0.9rem; background: #0f172a; color: #e2e8f0; border-radius: 10px; min-height: 220px; max-height: 720px; overflow: auto; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
@media (max-width: 1100px) { .workspace-grid { grid-template-columns: 1fr; } .catalog-list { max-height: none; } }
@media (max-width: 768px) { .hero-panel, .tab-intro, .detail-head, .result-head { flex-direction: column; } }
</style>
