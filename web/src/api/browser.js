import request from './index'

export function getBrowserStatus() {
  return request({ url: '/browser/status', method: 'get' })
}

export function connectBrowser(data) {
  return request({ url: '/browser/connect', method: 'post', data })
}

export function closeBrowser() {
  return request({ url: '/browser/close', method: 'post' })
}

export function launchWithDebug(data) {
  return request({ url: '/browser/launch-with-debug', method: 'post', data })
}

export function checkPort(port) {
  return request({ url: '/browser/check-port', method: 'post', data: { port } })
}
