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
              <span class="ui tiny teal label" v-if="selectedPage">Selected #{{ selectedPage.index }}</span>
              <span class="ui tiny orange label" v-if="focusedPage">Focused #{{ focusedPage.index }}</span>
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
                :class="{ active: selectedPageIndex === page.index, focused: page.isFocusedTab, visible: page.isVisibleTab && !page.isFocusedTab }"
                @click="selectPage(page.index)"
              >
                <span class="tab-chip-index">#{{ page.index }}</span>
                <span class="tab-chip-title">{{ page.title || 'Untitled' }}</span>
                <span v-if="page.isFocusedTab" class="tab-chip-flag focused">FOCUSED</span>
                <span v-else-if="page.isVisibleTab" class="tab-chip-flag visible">VISIBLE</span>
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
                  <label>内置模板</label>
                  <div class="template-toolbar">
                    <select v-model="browserJsForm.templateId" class="ui dropdown">
                      <option value="">请选择页面内 JS 模板</option>
                      <option v-for="item in browserJsTemplates" :key="item.id" :value="item.id">
                        {{ item.name }} · {{ item.category }}
                      </option>
                    </select>
                    <button type="button" class="ui button" :disabled="!selectedBrowserJsTemplate" @click="applyBrowserJsTemplate">
                      填入模板
                    </button>
                  </div>
                </div>
                <div v-if="selectedBrowserJsTemplate" class="template-intro">
                  <div class="template-head">
                    <div class="template-title">{{ selectedBrowserJsTemplate.name }}</div>
                    <span class="ui tiny teal basic label">{{ selectedBrowserJsTemplate.category }}</span>
                  </div>
                  <div class="template-desc">{{ selectedBrowserJsTemplate.description }}</div>
                  <div class="template-tips">{{ selectedBrowserJsTemplate.tips }}</div>
                </div>
                <div class="field">
                  <label>JavaScript</label>
                  <textarea
                    class="script-editor"
                    v-model="browserJsForm.expression"
                    rows="16"
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
                    <button type="button" class="ui fluid primary button" :class="{ loading: actionLoading }" :disabled="actionLoading" @click="executeBrowserJs">
                      {{ hasSelectedPage ? '执行页面内 JS' : '新建页并执行页面内 JS' }}
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
                  <label>内置模板</label>
                  <div class="template-toolbar">
                    <select v-model="playwrightForm.templateId" class="ui dropdown">
                      <option value="">请选择 Playwright 模板</option>
                      <option v-for="item in playwrightTemplates" :key="item.id" :value="item.id">
                        {{ item.name }} · {{ item.category }}
                      </option>
                    </select>
                    <button type="button" class="ui button" :disabled="!selectedPlaywrightTemplate" @click="applyPlaywrightTemplate">
                      填入模板
                    </button>
                  </div>
                </div>
                <div v-if="selectedPlaywrightTemplate" class="template-intro">
                  <div class="template-head">
                    <div class="template-title">{{ selectedPlaywrightTemplate.name }}</div>
                    <span class="ui tiny blue basic label">{{ selectedPlaywrightTemplate.category }}</span>
                  </div>
                  <div class="template-desc">{{ selectedPlaywrightTemplate.description }}</div>
                  <div class="template-tips">{{ selectedPlaywrightTemplate.tips }}</div>
                </div>
                <div class="field">
                  <label>Playwright 脚本</label>
                  <textarea
                    class="script-editor"
                    v-model="playwrightForm.expression"
                    rows="16"
                    placeholder="await page.setInputFiles('input[type=file]', '/tmp/a.png')&#10;return await page.title()"
                  ></textarea>
                  <small class="console-help">
                    可直接使用 `page`、`context`、`locator(selector)`、`console.log(...)`。支持 `await` 和 `return`。
                  </small>
                </div>
                <div class="field">
                  <label>执行</label>
                  <button type="button" class="ui fluid primary button" :class="{ loading: actionLoading }" :disabled="actionLoading" @click="executePlaywrightScript">
                    {{ hasSelectedPage ? '执行 Playwright 脚本' : '新建页并执行 Playwright 脚本' }}
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { executeBrowserDebug, getBrowserPages } from '@/api/browser'

const browserJsTemplates = [
  {
    id: 'page-basic-info',
    name: '页面基础信息',
    category: '信息读取',
    description: '读取标题、链接、分辨率、滚动位置和页面加载状态，适合先确认当前 tab 环境。',
    tips: '执行结果是一个对象，可先用这个模板确认自己连到了哪一页。',
    code: `return {
  title: document.title,
  href: location.href,
  readyState: document.readyState,
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight
  },
  scroll: {
    x: window.scrollX,
    y: window.scrollY
  }
}`
  },
  {
    id: 'selected-element-info',
    name: '读取首个匹配元素信息',
    category: '元素定位',
    description: '快速检查一个选择器是否命中，并查看文本、HTML、尺寸和可见性。',
    tips: '先把选择器里的 `.target-selector` 改成你的目标节点。',
    code: `const el = document.querySelector('.target-selector')
if (!el) return { found: false }

const rect = el.getBoundingClientRect()
return {
  found: true,
  tag: el.tagName,
  text: el.textContent?.trim(),
  html: el.innerHTML,
  visible: !!(rect.width || rect.height),
  rect: {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  }
}`
  },
  {
    id: 'list-extractor',
    name: '列表数据抽取',
    category: '批量读取',
    description: '遍历一组卡片节点，提取文本、链接和图片，适合调试列表页 DOM 结构。',
    tips: '把 `.list-item`、标题选择器、链接选择器改成实际页面结构。',
    code: `return Array.from(document.querySelectorAll('.list-item')).slice(0, 20).map((item, index) => ({
  index,
  text: item.querySelector('.title')?.textContent?.trim() || item.textContent?.trim(),
  href: item.querySelector('a')?.href || '',
  image: item.querySelector('img')?.src || ''
}))`
  },
  {
    id: 'fill-native-form',
    name: '原生表单赋值并触发事件',
    category: '表单处理',
    description: '直接在页面上下文给 input 或 textarea 赋值，并手动触发 input/change 事件。',
    tips: '适合某些前端框架页面，单纯改 value 不够时可以用它验证事件链。',
    code: `const el = document.querySelector('input, textarea')
if (!el) return { updated: false, reason: '未找到输入框' }

el.focus()
el.value = '这里改成你要输入的内容'
el.dispatchEvent(new Event('input', { bubbles: true }))
el.dispatchEvent(new Event('change', { bubbles: true }))

return {
  updated: true,
  tag: el.tagName,
  value: el.value
}`
  },
  {
    id: 'scroll-and-observe',
    name: '滚动页面并观察增量',
    category: '滚动加载',
    description: '连续滚动页面，记录前后高度变化，适合调试懒加载或瀑布流。',
    tips: '如果页面有无限滚动，这个模板能快速看出继续滚动后内容是否增长。',
    code: `const before = document.body.scrollHeight
window.scrollTo({ top: before, behavior: 'smooth' })

await new Promise(resolve => setTimeout(resolve, 1200))

const after = document.body.scrollHeight
return {
  before,
  after,
  increased: after - before,
  currentY: window.scrollY
}`
  },
  {
    id: 'inspect-storage',
    name: '检查 Cookie / Storage',
    category: '登录态排查',
    description: '读取页面上下文可见的 Cookie、localStorage、sessionStorage，适合判断登录态是否存在。',
    tips: 'localStorage/sessionStorage 可能很多，先看 key 列表更容易定位。',
    code: `return {
  cookie: document.cookie,
  localStorage: Object.fromEntries(Object.entries(localStorage)),
  sessionStorage: Object.fromEntries(Object.entries(sessionStorage))
}`
  }
]

const playwrightTemplates = [
  {
    id: 'pw-page-snapshot',
    name: '页面快照',
    category: '信息读取',
    description: '从 Playwright 侧读取标题、链接、页面尺寸和主按钮数量，适合确认脚本环境。',
    tips: '如果想看当前页面到底加载了什么，先跑这个模板最稳。',
    code: `const primaryButtons = await page.locator('button, [role="button"]').count()
return {
  title: await page.title(),
  url: page.url(),
  viewport: page.viewportSize(),
  buttonCount: primaryButtons
}`
  },
  {
    id: 'pw-highlight-selector',
    name: '高亮目标元素',
    category: '元素定位',
    description: '给指定选择器匹配到的前几个元素加描边和背景色，方便视觉确认定位是否正确。',
    tips: '把 `.target-selector` 改成实际选择器，执行后去浏览器页面看高亮效果。',
    code: `const selector = '.target-selector'
const count = await page.locator(selector).count()

await page.locator(selector).evaluateAll((nodes) => {
  nodes.slice(0, 5).forEach((node, index) => {
    node.style.outline = '2px solid #ef4444'
    node.style.background = index % 2 === 0 ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)'
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
})

return { selector, count, highlighted: Math.min(count, 5) }`
  },
  {
    id: 'pw-wait-for-selector',
    name: '等待元素出现',
    category: '等待同步',
    description: '等待指定元素出现并返回文本，适合调试异步加载和弹层渲染。',
    tips: '默认等待 10 秒，必要时可把 timeout 改大。',
    code: `const selector = '.target-selector'
await page.locator(selector).first().waitFor({ state: 'visible', timeout: 10000 })

return {
  selector,
  text: await page.locator(selector).first().textContent()
}`
  },
  {
    id: 'pw-form-fill-submit',
    name: '填写表单并提交',
    category: '表单处理',
    description: '演示如何清空输入框、输入文本、勾选复选框并点击提交按钮。',
    tips: '把选择器和示例文本改成真实页面字段，适合快速验证提交流程。',
    code: `await page.locator('input[name="title"]').fill('测试标题')
await page.locator('textarea').fill('这里填写更长的内容')

const checkbox = page.locator('input[type="checkbox"]').first()
if (await checkbox.count()) {
  await checkbox.check()
}

await page.locator('button[type="submit"], .submit-btn').first().click()
return { submitted: true, url: page.url() }`
  },
  {
    id: 'pw-upload-files',
    name: '上传文件',
    category: '文件处理',
    description: '给文件输入框设置本地文件路径，适合发布页图片或视频上传调试。',
    tips: '把文件路径改成当前机器真实存在的绝对路径。',
    code: `const files = [
  '/tmp/demo-1.png',
  '/tmp/demo-2.png'
]

await page.setInputFiles('input[type="file"]', files)
return {
  uploaded: files.length,
  names: files.map(item => item.split('/').pop())
}`
  },
  {
    id: 'pw-scroll-collect',
    name: '滚动并采集卡片',
    category: '列表抓取',
    description: '向下滚动若干次，然后提取卡片标题和链接，适合调试列表页采集。',
    tips: '选择器需要按目标站点调整，常用于商品列表、作品列表、评论区。',
    code: `for (let i = 0; i < 3; i += 1) {
  await page.mouse.wheel(0, 1600)
  await page.waitForTimeout(1000)
}

const rows = await page.locator('.list-item').evaluateAll((nodes) => {
  return nodes.slice(0, 20).map((node, index) => ({
    index,
    text: node.querySelector('.title')?.textContent?.trim() || node.textContent?.trim(),
    href: node.querySelector('a')?.href || ''
  }))
})

return rows`
  },
  {
    id: 'pw-listen-network',
    name: '监听接口响应',
    category: '网络调试',
    description: '等待一次接口返回并抽取状态码与 JSON 结果，适合定位页面真实请求。',
    tips: '先把 `/api/` 改成你关心的请求特征字符串。',
    code: `const response = await page.waitForResponse(
  (resp) => resp.url().includes('/api/') && resp.status() < 500,
  { timeout: 15000 }
)

let body
try {
  body = await response.json()
} catch {
  body = await response.text()
}

return {
  url: response.url(),
  status: response.status(),
  body
}`
  },
  {
    id: 'pw-console-debug',
    name: '输出调试日志并返回结构化结果',
    category: '调试输出',
    description: '演示如何在结果面板里同时看到 console 日志和 return 返回值。',
    tips: '适合排查多步骤脚本，每一步都可以加 `console.log`。',
    code: `console.log('当前标题', await page.title())
console.log('当前地址', page.url())

const count = await page.locator('input, textarea, button').count()
console.info('可交互元素数量', count)

return {
  interactiveCount: count,
  timestamp: new Date().toISOString()
}`
  }
]

const browserPages = ref([])
const selectedPageIndex = ref(null)
const lastAutoSelectedPageIndex = ref(null)
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
  templateId: browserJsTemplates[0].id,
  expression: 'document.title',
  waitMs: 1000
})

const playwrightForm = reactive({
  templateId: playwrightTemplates[0].id,
  expression: "await page.setInputFiles('input[type=file]', '/tmp/a.png')\nreturn await page.title()"
})

const selectedPage = computed(() => browserPages.value.find(item => item.index === selectedPageIndex.value) || null)
const focusedPage = computed(() => browserPages.value.find(item => item.isFocusedTab) || null)
const hasSelectedPage = computed(() => selectedPage.value !== null)
const selectedBrowserJsTemplate = computed(() => browserJsTemplates.find(item => item.id === browserJsForm.templateId) || null)
const selectedPlaywrightTemplate = computed(() => playwrightTemplates.find(item => item.id === playwrightForm.templateId) || null)
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
    lastAutoSelectedPageIndex.value = null
    return
  }

  const preferredPage = browserPages.value.find(item => item.isFocusedTab)
    || browserPages.value.find(item => item.isVisibleTab)
    || browserPages.value[0]

  const hasCurrentSelection = browserPages.value.some(item => item.index === selectedPageIndex.value)
  const shouldFollowFocusedPage =
    !hasCurrentSelection
    || selectedPageIndex.value === null
    || selectedPageIndex.value === lastAutoSelectedPageIndex.value

  if (shouldFollowFocusedPage) {
    selectedPageIndex.value = preferredPage.index
    lastAutoSelectedPageIndex.value = preferredPage.index
  }
}

function selectPage(index) {
  selectedPageIndex.value = index
  lastAutoSelectedPageIndex.value = null
}

function applyBrowserJsTemplate() {
  if (!selectedBrowserJsTemplate.value) return
  browserJsForm.expression = selectedBrowserJsTemplate.value.code
}

function applyPlaywrightTemplate() {
  if (!selectedPlaywrightTemplate.value) return
  playwrightForm.expression = selectedPlaywrightTemplate.value.code
}

watch(() => browserJsForm.templateId, () => {
  applyBrowserJsTemplate()
})

watch(() => playwrightForm.templateId, () => {
  applyPlaywrightTemplate()
})

async function ensureSelectedPageForExecution() {
  if (hasSelectedPage.value) return true

  await runAction('newPage')
  return hasSelectedPage.value
}

async function executeBrowserJs() {
  const ready = await ensureSelectedPageForExecution()
  if (!ready) {
    setStatus('没有可执行的页面，请先连接浏览器或手动新建页', 'error')
    return
  }
  await runAction('eval', { expression: browserJsForm.expression })
}

async function executePlaywrightScript() {
  const ready = await ensureSelectedPageForExecution()
  if (!ready) {
    setStatus('没有可执行的页面，请先连接浏览器或手动新建页', 'error')
    return
  }
  await runAction('playwright', { expression: playwrightForm.expression })
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
        lastAutoSelectedPageIndex.value = data.page.index
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
  applyBrowserJsTemplate()
  applyPlaywrightTemplate()
  await refreshTabs(true)
  pollTimer = setInterval(() => {
    refreshTabs(true)
  }, 1000)
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
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.tab-chip:hover {
  transform: translateY(-1px);
  border-color: #93c5fd;
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.18);
}

.tab-chip.active {
  border-color: #2185d0;
  background: linear-gradient(180deg, #edf6ff 0%, #dbeafe 100%);
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.16);
}

.tab-chip.focused {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 52%, #fde68a 100%);
  box-shadow: 0 14px 30px rgba(245, 158, 11, 0.28);
}

.tab-chip.focused.active {
  border-color: #d97706;
  box-shadow: 0 16px 34px rgba(217, 119, 6, 0.34);
}

.tab-chip.visible:not(.focused) {
  border-color: #10b981;
  background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
  box-shadow: 0 10px 24px rgba(16, 185, 129, 0.16);
}

.tab-chip.focused .tab-chip-title,
.tab-chip.focused .tab-chip-index {
  color: #92400e;
}

.tab-chip.visible:not(.focused) .tab-chip-title,
.tab-chip.visible:not(.focused) .tab-chip-index {
  color: #065f46;
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

.tab-chip-flag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.16rem 0.45rem;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.tab-chip-flag.focused {
  color: #b45309;
  background: #ffedd5;
}

.tab-chip-flag.visible {
  color: #047857;
  background: #d1fae5;
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

.script-editor {
  min-height: 360px;
  resize: vertical;
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.template-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.template-intro {
  margin-bottom: 0.9rem;
  padding: 0.85rem 0.95rem;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #f3f7fb 100%);
  border: 1px solid #dbe7f3;
}

.template-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
}

.template-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.template-desc {
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}

.template-tips {
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 1100px) {
  .tab-chip {
    max-width: 100%;
  }

  .template-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
