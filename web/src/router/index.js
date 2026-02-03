import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/layout/index.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/browser',
    children: [
      { path: 'browser', name: 'Browser', component: () => import('@/views/browser/index.vue'), meta: { title: '浏览器连接' } },
      { path: 'publish', name: 'Publish', component: () => import('@/views/publish/index.vue'), meta: { title: '平台发布' } }
    ]
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
