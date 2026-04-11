import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '@/layout/index.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/control-center',
    children: [
      { path: 'control-center', name: 'ControlCenter', component: () => import('@/views/control-center/index.vue'), meta: { title: '集中操作台', subtitle: '统一管理电商采集与浏览器工具集' } },
      { path: 'browser', name: 'Browser', component: () => import('@/views/browser/index.vue'), meta: { title: '浏览器连接', subtitle: '连接 Chrome 以便发布' } },
      { path: 'tasks', name: 'Tasks', component: () => import('@/views/tasks/index.vue'), meta: { title: '任务中心', subtitle: '查看运行任务、元数据、状态与详细日志' } },
      { path: 'browser-debug', name: 'BrowserDebug', component: () => import('@/views/browser-debug/index.vue'), meta: { title: '浏览器调试', subtitle: '管理标签页并实时执行页面操作与 JavaScript' } },
      { path: 'api-doc', name: 'ApiDoc', component: () => import('@/views/api-doc/index.vue'), meta: { title: 'API 文档', subtitle: '对外接口说明' } }
    ]
  }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
