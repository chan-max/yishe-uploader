<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>
          <i class="cloud upload icon"></i>
          Yishe Uploader
        </h2>
        <div class="sidebar-tagline">多平台发布</div>
      </div>
      <div class="sidebar-menu">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="menu-item"
          active-class="active"
        >
          <i :class="item.icon + ' icon'"></i>
          <span>{{ item.title }}</span>
        </router-link>
      </div>
    </aside>
    <main class="main-content">
      <div class="main-content-inner" :class="{ 'publish-full-width': isPublishPage }">
        <h1 class="ui header page-header">
          <i :class="headerIcon + ' icon'"></i>
          <div class="content">
            {{ currentTitle }}
            <div class="sub header">{{ currentSubtitle }}</div>
          </div>
        </h1>
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const menuItems = [
  { path: '/browser', title: '浏览器连接', icon: 'linkify' },
  { path: '/publish', title: '平台发布', icon: 'upload' },
  { path: '/api-doc', title: 'API 文档', icon: 'book' }
]
const currentTitle = computed(() => {
  const r = route.matched.find(m => m.meta?.title)
  return r?.meta?.title || 'Yishe Uploader'
})
const currentSubtitle = computed(() => {
  const r = route.matched.find(m => m.meta?.subtitle)
  return r?.meta?.subtitle || '多平台内容发布控制台'
})
const headerIcon = computed(() => {
  const item = menuItems.find(m => route.path.startsWith(m.path))
  return item?.icon || 'home'
})
const isPublishPage = computed(() => route.path.startsWith('/publish'))
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  width: 220px;
  background: #1b1c1d;
  color: #fff;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  overflow-y: auto;
  z-index: 1000;
}
.sidebar-header {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  h2 {
    color: #fff;
    margin: 0;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}
.sidebar-tagline {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 0.25rem;
}
.sidebar-menu {
  padding: 0.5rem 0;
}
.menu-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  border-left: 3px solid transparent;
  text-decoration: none;
  &.active {
    background-color: rgba(33, 133, 208, 0.2);
    color: #fff;
    border-left-color: #2185d0;
  }
  &:hover:not(.active) {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .icon {
    width: 20px;
    text-align: center;
  }
}
.main-content {
  flex: 1;
  min-height: 0;
  height: 100vh;
  max-height: 100vh;
  margin-left: 220px;
  padding: 1rem 1.5rem;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}
.main-content-inner {
  max-width: 960px;
  width: 100%;
}
/* 发布页使用整行宽度，便于右侧栏铺满 */
.main-content-inner.publish-full-width {
  max-width: none;
}
.page-header {
  margin-bottom: 1.5rem !important;
  .ui.header {
    font-size: 1.15em;
  }
  .sub.header {
    font-size: 0.85em;
  }
}
</style>
