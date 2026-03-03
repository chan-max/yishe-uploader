<template>
  <div class="api-doc-page">
    <div class="ui segment">
      <h2 class="ui header">
        <i class="book icon"></i>
        <div class="content">
          API 在线调试
          <div class="sub header">Swagger UI：可查看全部接口、参数并直接发起请求</div>
        </div>
      </h2>

      <div class="ui small buttons" style="margin-top: 0.75rem;">
        <a class="ui primary button" :href="swaggerUrl" target="_blank" rel="noopener noreferrer">
          <i class="external alternate icon"></i>
          打开 Swagger 在线调试
        </a>
        <a class="ui button" :href="docsJsonUrl" target="_blank" rel="noopener noreferrer">
          <i class="file code icon"></i>
          查看 OpenAPI JSON
        </a>
      </div>
    </div>

    <div class="ui info message">
      <i class="info circle icon"></i>
      <div class="content">
        <div class="header">使用说明</div>
        <p>点击“打开 Swagger 在线调试”后，在新页面中展开任意接口，使用 Try it out 填写参数并执行。</p>
        <p>已覆盖发布、浏览器、上传、登录状态、爬虫等所有可用接口。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const API_BASE = ''

const swaggerUrl = computed(() => `${API_BASE}/api/swagger`)
const docsJsonUrl = computed(() => `${API_BASE}/api/docs`)
</script>

<style scoped>
.api-doc-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 12px;
}
</style>
