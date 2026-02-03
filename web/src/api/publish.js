import request from './index'

/** 发布（单平台传 platform，多平台传 platforms，同一接口） */
export function publish(data) {
  return request({ url: '/publish', method: 'post', data })
}

/** @deprecated 请使用 publish，传 platforms 即可 */
export function batchPublish(data) {
  return request({ url: '/publish', method: 'post', data })
}

export function getPublishHistory(params) {
  return request({ url: '/publish/history', method: 'get', params })
}

export function getPublishDetail(id) {
  return request({ url: `/publish/${id}`, method: 'get' })
}

export function deletePublishRecord(id) {
  return request({ url: `/publish/${id}`, method: 'delete' })
}

export function createScheduleTask(data) {
  return request({ url: '/schedule', method: 'post', data })
}

export function getScheduleTasks(params) {
  return request({ url: '/schedule', method: 'get', params })
}

export function cancelScheduleTask(id) {
  return request({ url: `/schedule/${id}`, method: 'delete' })
}

export function uploadMedia(formData, onProgress) {
  return request({
    url: '/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  })
}
