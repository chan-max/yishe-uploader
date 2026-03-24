import request from './index'

export function getTaskList(params) {
  return request({ url: '/tasks', method: 'get', params })
}

export function getTaskDetail(taskId) {
  return request({ url: `/tasks/${encodeURIComponent(taskId)}`, method: 'get' })
}

export function getTaskLogs(taskId) {
  return request({ url: `/tasks/${encodeURIComponent(taskId)}/logs`, method: 'get' })
}
