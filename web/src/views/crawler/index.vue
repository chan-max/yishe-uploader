<template>
  <div class="crawler-page">
    <div v-if="status.message" :class="['ui', 'message', statusTypeClass]">
      <i class="close icon" @click="status.message = ''"></i>
      {{ status.message }}
    </div>

    <!-- 已实现的爬虫 -->
    <div class="ui segment">
      <h2 class="ui dividing header">🚀 已实现的爬虫</h2>

      <!-- Sora 爬虫卡片 -->
      <div class="ui card crawler-card" style="width: 100%;">
        <div class="content">
          <div class="header">
            <i class="icons">
              <i class="large openai icon" style="color: #10a37f;"></i>
              <i class="corner small check icon" style="color: #21ba45;"></i>
            </i>
            Sora 图片爬虫
          </div>
          <div class="meta" style="margin-top: 0.5rem;">
            <span class="ui label small">OpenAI Sora</span>
            <span class="ui label small">图片提取</span>
            <span class="ui label small green">已实现</span>
          </div>
          <div class="description" style="margin-top: 1rem; color: #666;">
            自动访问 <code>sora.chatgpt.com/explore?type=images</code> 页面，提取图片信息（URL、描述等），最多支持提取 50 张图片。
          </div>
        </div>
        <div class="extra content">
          <div class="ui small form">
            <div class="field">
              <label>提取图片数量</label>
              <div style="display: flex; gap: 0.5rem;">
                <input
                  v-model.number="soraConfig.maxImages"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="20"
                  :disabled="soraLoading"
                  style="flex: 1; max-width: 150px;"
                />
                <button
                  type="button"
                  class="ui primary button"
                  :class="{ loading: soraLoading }"
                  :disabled="soraLoading"
                  @click="crawlSora"
                >
                  <i class="download icon"></i>
                  执行爬虫
                </button>
              </div>
            </div>
          </div>
          <div v-if="soraLoading" class="ui tiny message" style="margin-top: 0.75rem;">
            ⏳ 正在执行爬虫，可能需要 30-60 秒，请耐心等待...
          </div>
        </div>
      </div>

      <!-- Sora 结果展示 -->
      <div v-if="soraResult" class="ui segment" style="margin-top: 1rem;">
        <h4 class="ui header">
          <i class="images icon"></i>
          <div class="content">爬取结果 <span class="ui small label">{{ soraResult.data.totalImages }} 张图片</span></div>
        </h4>

        <div class="ui grid">
          <div class="sixteen wide column">
            <div class="ui small statistic">
              <div class="label">总数</div>
              <div class="value">{{ soraResult.data.totalImages }}</div>
            </div>
            <div class="ui small statistic" style="margin-left: 2rem;">
              <div class="label">爬取时间</div>
              <div class="value">{{ formatTime(soraResult.data.crawledAt) }}</div>
            </div>
          </div>
        </div>

        <!-- 图片网格展示 -->
        <div class="ui four column grid" style="margin-top: 1.5rem;">
          <div
            v-for="(img, idx) in soraResult.data.images"
            :key="idx"
            class="column"
            style="margin-bottom: 1rem;"
          >
            <div class="ui card" style="width: 100%; margin: 0;">
              <div class="image" style="height: 150px; overflow: hidden; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                <img
                  :src="img.url"
                  :alt="img.alt"
                  style="max-width: 100%; max-height: 100%; object-fit: cover;"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <div v-if="imgLoadError[idx]" style="color: #999; text-align: center; font-size: 0.85rem;">
                  加载失败
                </div>
              </div>
              <div class="content">
                <div class="header" style="font-size: 0.9rem;">
                  #{{ img.index }}
                </div>
                <div class="description">
                  <p style="font-size: 0.85rem; margin: 0.25rem 0; color: #666;">
                    <strong>{{ img.alt || img.title || '(无标题)' }}</strong>
                  </p>
                  <p v-if="img.description" style="font-size: 0.8rem; margin: 0.25rem 0; color: #999; line-height: 1.3;">
                    {{ img.description.slice(0, 60) }}{{ img.description.length > 60 ? '...' : '' }}
                  </p>
                </div>
              </div>
              <div class="extra content">
                <a
                  :href="img.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ui mini button"
                  style="width: 100%;"
                >
                  查看原图
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- 导出按钮 -->
        <div class="ui buttons" style="margin-top: 1rem;">
          <button type="button" class="ui secondary button" @click="exportSoraData">
            <i class="download icon"></i>
            导出 JSON
          </button>
          <button type="button" class="ui secondary button" @click="exportSoraUrls">
            <i class="copy icon"></i>
            复制所有 URL
          </button>
        </div>
      </div>
    </div>

    <div class="ui divider" style="margin: 2rem 0;"></div>

    <!-- 使用说明 -->
    <div class="ui segment" style="margin-top: 2rem;">
      <h3 class="ui header">
        <i class="help circle icon"></i>
        使用说明
      </h3>
      <div class="ui relaxed list">
        <div class="item">
          <i class="arrow right icon"></i>
          <div class="content">
            <strong>Sora 爬虫</strong> 会自动打开 OpenAI Sora 探索页面，等待图片加载完成后提取核心信息。首次可能需要 30-60 秒。
          </div>
        </div>
        <div class="item">
          <i class="arrow right icon"></i>
          <div class="content">
            <strong>浏览器连接</strong> 是必需的。请先在「浏览器连接」页面连接 Chrome，确保浏览器实例可用。
          </div>
        </div>
        <div class="item">
          <i class="arrow right icon"></i>
          <div class="content">
            <strong>结果导出</strong> 支持 JSON 导出和 URL 列表复制，便于后续数据处理。
          </div>
        </div>
        <div class="item">
          <i class="arrow right icon"></i>
          <div class="content">
            <strong>API 调用</strong> 可直接调用 <code>POST /api/crawler/run</code> 接口快速集成到其他系统。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { crawlSoraImages } from '@/api/crawler.js'

const status = reactive({ message: '', type: 'info' })
const soraLoading = ref(false)
const soraResult = ref(null)
const soraConfig = reactive({ maxImages: 20 })
const imgLoadError = ref({})

const statusTypeClass = computed(() => {
  if (status.type === 'success') return 'success'
  if (status.type === 'error') return 'error'
  if (status.type === 'warning') return 'warning'
  return 'info'
})

function setStatus(message, type = 'info', duration = 5000) {
  status.message = message
  status.type = type
  if (duration) {
    setTimeout(() => {
      status.message = ''
    }, duration)
  }
}

async function crawlSora() {
  if (soraLoading.value) return

  const maxImages = Math.max(1, Math.min(50, soraConfig.maxImages || 20))
  soraLoading.value = true
  soraResult.value = null
  imgLoadError.value = {}

  try {
    setStatus(`⏳ 正在爬取 Sora 图片（最多 ${maxImages} 张），请耐心等待...`, 'info', 0)
    const result = await crawlSoraImages(maxImages)

    if (result.success) {
      soraResult.value = result
      setStatus(`✅ 成功爬取 ${result.data.totalImages} 张图片！`, 'success')
    } else {
      throw new Error(result.message || '爬虫执行失败')
    }
  } catch (error) {
    console.error('[crawl-sora]', error)
    setStatus(`❌ 爬虫执行失败: ${error.message || '未知错误'}`, 'error')
    soraResult.value = null
  } finally {
    soraLoading.value = false
  }
}

function formatTime(dateStr) {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString()
  } catch {
    return dateStr
  }
}

function exportSoraData() {
  if (!soraResult.value) return

  const dataStr = JSON.stringify(soraResult.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sora-crawler-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
  setStatus('✅ JSON 文件已下载', 'success')
}

function exportSoraUrls() {
  if (!soraResult.value || !soraResult.value.data.images) return

  const urls = soraResult.value.data.images.map(img => img.url).join('\n')
  navigator.clipboard
    .writeText(urls)
    .then(() => {
      setStatus(`✅ 已复制 ${soraResult.value.data.images.length} 个 URL 到剪贴板`, 'success')
    })
    .catch(() => {
      setStatus('❌ 复制失败，请手动复制', 'error')
    })
}
</script>

<style scoped>
.crawler-page {
  padding: 1rem;
}

.crawler-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.crawler-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.ui.small.statistic {
  display: inline-block;
}

.ui.four.column.grid {
  gap: 1rem;
}

@media only screen and (max-width: 767px) {
  .ui.four.column.grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}

@media only screen and (max-width: 480px) {
  .ui.four.column.grid {
    display: grid;
    grid-template-columns: 1fr;
  }
}

code {
  background-color: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.ui.small.form .field {
  margin-bottom: 0;
}
</style>
