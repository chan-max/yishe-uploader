import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '@/layout/index.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/browser',
    children: [
      { path: 'browser', name: 'Browser', component: () => import('@/views/browser/index.vue'), meta: { title: '浏览器连接', subtitle: '连接 Chrome 以便发布' } },
      { path: 'api-doc', name: 'ApiDoc', component: () => import('@/views/api-doc/index.vue'), meta: { title: 'API 文档', subtitle: '对外接口说明' } }
    ]
  }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
