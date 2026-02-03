<template>
  <div class="layout">
    <aside class="layout-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">易社发布</span>
      </div>
      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="nav-item--active"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.title }}</span>
        </router-link>
      </nav>
    </aside>
    <main class="layout-main">
      <header class="main-header">
        <h1 class="main-title">{{ currentTitle }}</h1>
      </header>
      <div class="main-content">
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
  { path: '/browser', title: '浏览器连接', icon: '🔗' },
  { path: '/publish', title: '平台发布', icon: '📤' }
]
const currentTitle = computed(() => {
  const r = route.matched.find(m => m.meta?.title)
  return r?.meta?.title || '易社发布'
})
</script>

<style lang="scss" scoped>
.layout { display: flex; width: 100%; height: 100vh; overflow: hidden; }
.layout-sidebar {
  width: 200px; min-width: 200px; background: #f9fafb; color: #374151;
  display: flex; flex-direction: column; border-right: 1px solid #e5e7eb;
}
.sidebar-header { padding: 1rem; border-bottom: 1px solid #e5e7eb; }
.sidebar-title { font-size: 1rem; font-weight: 600; color: #111827; }
.sidebar-nav { flex: 1; padding: 0.5rem 0; overflow-y: auto; }
.nav-item {
  display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem;
  color: #6b7280; text-decoration: none; transition: background 0.12s, color 0.12s;
  margin: 0 0.25rem; border-radius: 4px; font-size: 0.875rem;
  &:hover { background: #f3f4f6; color: #111827; }
  &.nav-item--active { background: #eff6ff; color: #2563eb; font-weight: 500; }
}
.nav-icon { font-size: 1rem; opacity: 0.85; }
.nav-label { font-size: 0.875rem; }
.layout-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #fff; }
.main-header { padding: 0.875rem 1.25rem; border-bottom: 1px solid #e5e7eb; background: #fff; }
.main-title { margin: 0; font-size: 1.125rem; font-weight: 600; color: #111827; }
.main-content { flex: 1; padding: 1.25rem; overflow-y: auto; background: #fafafa; }
</style>
