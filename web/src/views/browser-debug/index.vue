<template>
  <div class="browser-debug-page">
    <div v-if="status.message" :class="['ui', 'message', statusClass]">
      {{ status.message }}
    </div>

    <div class="debug-layout">
      <section class="workspace">
        <div class="ui segment current-page-card">
          <div class="panel-header">
            <div>
              <h3 class="ui header">当前页面</h3>
              <div class="panel-meta">在这里查看并切换标签页、聚焦到浏览器窗口、关闭当前页</div>
            </div>
            <div class="ui tiny labels">
              <span class="ui tiny label">{{ browserPages.length }} Tabs</span>
              <span class="ui tiny teal label" v-if="selectedPage">#{{ selectedPage.index }}</span>
            </div>
          </div>

          <div class="ui small buttons compact-toolbar">
            <button type="button" class="ui primary button" :class="{ loading: actionLoading }" :disabled="actionLoading" @click="createPage">
              新建页
            </button>
            <button type="button" class="ui button" :class="{ loading: tabsLoading }" :disabled="tabsLoading" @click="refreshTabs">
              刷新标签页
            </button>
            <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="focusSelectedPage">
              进入页面
            </button>
            <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="reloadSelectedPage">
              刷新当前页
            </button>
            <button type="button" class="ui red button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="closeSelectedPage">
              关闭当前页
            </button>
          </div>

          <div class="tab-strip-wrap">
            <div v-if="browserPages.length" class="tab-strip">
              <button
                v-for="page in browserPages"
                :key="page.index"
                type="button"
                class="tab-chip"
                :class="{ active: selectedPageIndex === page.index }"
                @click="selectPage(page.index)"
              >
                <span class="tab-chip-index">#{{ page.index }}</span>
                <span class="tab-chip-title">{{ page.title || 'Untitled' }}</span>
              </button>
            </div>
            <div v-else class="ui tiny message empty-inline-state">
              当前没有 tab。请先去“浏览器连接”模块连接浏览器，然后回到这里调试。
            </div>
          </div>

          <div class="current-page-grid">
            <div>
              <div class="meta-label">标题</div>
              <div class="meta-value">{{ selectedPage?.title || '-' }}</div>
            </div>
            <div>
              <div class="meta-label">URL</div>
              <div class="meta-value url">{{ selectedPage?.url || '-' }}</div>
            </div>
          </div>
        </div>

        <div class="ui two column stackable grid">
          <div class="column">
            <div class="ui segment action-card">
              <div class="panel-header">
                <div>
                  <h3 class="ui header">快速操作</h3>
                  <div class="panel-meta">适合调试 DOM 行为、输入选择器、直接跳转页面</div>
                </div>
              </div>

              <div class="ui small form">
                <div class="field">
                  <label>打开链接</label>
                  <div class="ui action input">
                    <input v-model="quickForm.url" type="text" placeholder="https://creator.xiaohongshu.com/" />
                    <button type="button" class="ui primary button" :class="{ loading: actionLoading }" :disabled="actionLoading" @click="runAction('goto', { url: quickForm.url })">
                      打开
                    </button>
                  </div>
                </div>

                <div class="field">
                  <label>Selector</label>
                  <input v-model="quickForm.selector" type="text" placeholder="button, input[name='title'], .submit-btn" />
                </div>

                <div class="field">
                  <label>Text</label>
                  <textarea v-model="quickForm.text" rows="4" placeholder="填入的内容，或逐字输入的内容"></textarea>
                </div>

                <div class="field">
                  <label>Key</label>
                  <input v-model="quickForm.key" type="text" placeholder="Enter / Tab / Escape" />
                </div>
              </div>

              <div class="action-grid">
                <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('click', { selector: quickForm.selector })">点击</button>
                <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('fill', { selector: quickForm.selector, text: quickForm.text })">填充</button>
                <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('type', { selector: quickForm.selector, text: quickForm.text })">逐字输入</button>
                <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('press', { selector: quickForm.selector, key: quickForm.key })">按键</button>
                <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('text', { selector: quickForm.selector })">读文本</button>
                <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('html', { selector: quickForm.selector })">读 HTML</button>
                <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('count', { selector: quickForm.selector })">统计数量</button>
                <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('screenshot')">截图</button>
              </div>
            </div>
          </div>

          <div class="column">
            <div class="ui segment console-card">
              <div class="panel-header">
                <div>
                  <h3 class="ui header">页面内 JS</h3>
                  <div class="panel-meta">运行在浏览器页面上下文里，适合读取 DOM、文本、变量和页面状态。</div>
                </div>
              </div>

              <div class="ui small form">
                <div class="field">
                  <label>JavaScript</label>
                  <textarea
                    v-model="browserJsForm.expression"
                    rows="8"
                    placeholder="document.title&#10;document.querySelector('button')?.innerText"
                  ></textarea>
                </div>
                <div class="two fields">
                  <div class="field">
                    <label>等待毫秒</label>
                    <div class="ui action input">
                      <input v-model.number="browserJsForm.waitMs" type="number" min="1" placeholder="1000" />
                      <button type="button" class="ui button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('wait', { ms: browserJsForm.waitMs })">
                        Wait
                      </button>
                    </div>
                  </div>
                  <div class="field">
                    <label>执行</label>
                    <button type="button" class="ui fluid primary button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('eval', { expression: browserJsForm.expression })">
                      执行页面内 JS
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="ui segment console-card" style="margin-top: 1rem;">
              <div class="panel-header">
                <div>
                  <h3 class="ui header">Playwright 脚本</h3>
                  <div class="panel-meta">运行在服务端 Playwright 上，可直接使用 `page`、`context`、`locator(selector)`，支持 `await page.setInputFiles(...)`。</div>
                </div>
              </div>

              <div class="ui small form">
                <div class="field">
                  <label>Playwright 脚本</label>
                  <textarea
                    v-model="playwrightForm.expression"
                    rows="8"
                    placeholder="await page.setInputFiles('input[type=file]', '/tmp/a.png')&#10;return await page.title()"
                  ></textarea>
                  <small class="console-help">
                    可直接使用 `page`、`context`、`locator(selector)`、`console.log(...)`。支持 `await` 和 `return`。
                  </small>
                </div>
                <div class="field">
                  <label>执行</label>
                  <button type="button" class="ui fluid primary button" :class="{ loading: actionLoading }" :disabled="!hasSelectedPage || actionLoading" @click="runAction('playwright', { expression: playwrightForm.expression })">
                    执行 Playwright 脚本
                  </button>
                </div>
                <div class="ui tiny info message">
                  示例：
                  <code>await page.setInputFiles('input[type=file]', '/tmp/a.png')</code>
                  <br />
                  <code>return await page.locator('input[type=file]').count()</code>
                  <br />
                  <code>console.log(await page.title())</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="ui segment result-card">
          <div class="panel-header">
            <div>
              <h3 class="ui header">结果输出</h3>
              <div class="panel-meta">展示最近一次操作结果。可以作为轻量调试台使用。</div>
            </div>
            <button type="button" class="ui tiny button" @click="resultText = ''">清空</button>
          </div>
          <pre class="result-output">{{ resultText || '暂无执行结果' }}</pre>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { executeBrowserDebug, getBrowserPages } from '@/api/browser'

const browserPages = ref([])
const selectedPageIndex = ref(null)
const tabsLoading = ref(false)
const actionLoading = ref(false)
const resultText = ref('')
const status = reactive({ message: '', type: 'info' })

const quickForm = reactive({
  url: '',
  selector: '',
  text: '',
  key: 'Enter'
})

const browserJsForm = reactive({
  expression: 'document.title',
  waitMs: 1000
})

const playwrightForm = reactive({
  expression: "await page.setInputFiles('input[type=file]', '/tmp/a.png')\nreturn await page.title()"
})

const selectedPage = computed(() => browserPages.value.find(item => item.index === selectedPageIndex.value) || null)
const hasSelectedPage = computed(() => selectedPage.value !== null)
const statusClass = computed(() => {
  if (status.type === 'success') return 'success'
  if (status.type === 'error') return 'error'
  return 'info'
})

function setStatus(message, type = 'info') {
  status.message = message
  status.type = type
}

function syncSelectedPage() {
  if (!browserPages.value.length) {
    selectedPageIndex.value = null
    return
  }
  if (!browserPages.value.some(item => item.index === selectedPageIndex.value)) {
    selectedPageIndex.value = browserPages.value[0].index
  }
}

function selectPage(index) {
  selectedPageIndex.value = index
}

async function refreshTabs(silent = false) {
  tabsLoading.value = !silent
  try {
    const res = await getBrowserPages()
    browserPages.value = Array.isArray(res?.data) ? res.data : []
    syncSelectedPage()
    if (!silent) setStatus('标签页已刷新', 'success')
  } catch (error) {
    browserPages.value = []
    selectedPageIndex.value = null
    if (!silent) {
      setStatus(error?.response?.data?.message || error.message || '获取标签页失败', 'error')
    }
  } finally {
    tabsLoading.value = false
  }
}

async function runAction(action, extra = {}) {
  actionLoading.value = true
  try {
    const payload = {
      action,
      pageIndex: selectedPageIndex.value,
      ...extra
    }
    const res = await executeBrowserDebug(payload)
    const data = res?.data || res
    resultText.value = JSON.stringify(data, null, 2)
    if (Array.isArray(data?.pages)) {
      browserPages.value = data.pages
      syncSelectedPage()
      if (action === 'newPage' && data.page?.index >= 0) {
        selectedPageIndex.value = data.page.index
      }
    } else {
      await refreshTabs(true)
    }
    setStatus(`执行成功: ${action}`, 'success')
  } catch (error) {
    setStatus(error?.response?.data?.message || error.message || `执行失败: ${action}`, 'error')
  } finally {
    actionLoading.value = false
  }
}

async function createPage() {
  await runAction('newPage')
}

async function focusSelectedPage() {
  await runAction('bringToFront')
}

async function reloadSelectedPage() {
  await runAction('reload')
}

async function closeSelectedPage() {
  const closingIndex = selectedPageIndex.value
  await runAction('closePage')
  if (!browserPages.value.some(item => item.index === closingIndex)) {
    syncSelectedPage()
  }
}

let pollTimer
onMounted(async () => {
  await refreshTabs(true)
  pollTimer = setInterval(() => {
    refreshTabs(true)
  }, 3000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped lang="scss">
.browser-debug-page {
  min-height: calc(100vh - 120px);
}

.workspace {
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.panel-meta {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.url {
  margin-top: 0.45rem;
  word-break: break-all;
  color: #4b5563;
  font-size: 12px;
}

.current-page-card,
.action-card,
.console-card,
.result-card {
  border-radius: 16px;
}

.current-page-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
}

.meta-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.meta-value {
  font-size: 14px;
  color: #111827;
}

.compact-toolbar {
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.tab-strip-wrap {
  margin-bottom: 0.9rem;
}

.tab-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tab-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 280px;
  border: 1px solid #d9e1ec;
  background: #f8fafc;
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  transition: 0.2s ease;
}

.tab-chip:hover,
.tab-chip.active {
  border-color: #2185d0;
  background: #edf6ff;
}

.tab-chip-index {
  color: #2185d0;
  font-size: 12px;
  font-weight: 700;
}

.tab-chip-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #111827;
  font-size: 12px;
}

.empty-inline-state {
  margin: 0 !important;
}

.action-grid {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.result-output {
  background: #0f172a;
  color: #dbeafe;
  border-radius: 12px;
  padding: 1rem;
  min-height: 220px;
  max-height: 480px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.console-help {
  display: block;
  margin-top: 0.45rem;
  color: #6b7280;
  line-height: 1.5;
}

@media (max-width: 1100px) {
  .tab-chip {
    max-width: 100%;
  }
}
</style>
