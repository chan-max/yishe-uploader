import request from './index'

export function publishContent(data) {
  return request({ url: '/publish', method: 'post', data })
}

export function batchPublish(data) {
  return request({ url: '/publish/batch', method: 'post', data })
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
