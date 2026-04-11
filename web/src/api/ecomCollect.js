import request from './index'

export function getEcomCollectPlatforms() {
  return request({ url: '/ecom-collect/platforms', method: 'get' })
}

export function getEcomCollectCapabilities() {
  return request({ url: '/ecom-collect/capabilities', method: 'get' })
}

export function runEcomCollectTask(data = {}) {
  return request({ url: '/ecom-collect/run', method: 'post', data })
}
