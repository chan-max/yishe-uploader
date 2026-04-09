import request from './index'

export function getBrowserStatus() {
  return request({ url: '/browser/status', method: 'get' })
}

export function connectBrowser(data) {
  return request({ url: '/browser/connect', method: 'post', data })
}

export function closeBrowser(profileId) {
  return request({
    url: '/browser/close',
    method: 'post',
    data: profileId ? { profileId } : {}
  })
}

export function launchWithDebug(data) {
  return request({ url: '/browser/launch-with-debug', method: 'post', data })
}

export function checkPort(port) {
  return request({ url: '/browser/check-port', method: 'post', data: { port } })
}

/**
 * 在已连接浏览器中打开指定平台创作页
 * @param {string} platform - 平台 id：douyin | xiaohongshu | weibo | kuaishou | doudian | kuaishou_shop | temu
 */
export function openPlatformUrl(platform) {
  return request({ url: '/browser/open-platform', method: 'post', data: { platform } })
}

/**
 * 在已连接浏览器中打开指定链接
 * @param {string} url - http/https 链接
 */
export function openLinkUrl(url) {
  return request({ url: '/browser/open-link', method: 'post', data: { url } })
}

export function getBrowserSmallFeatures() {
  return request({ url: '/browser/small-features', method: 'get' })
}

export function runBrowserSmallFeature(featureKey, data = {}) {
  return request({
    url: '/browser/small-features/run',
    method: 'post',
    data: {
      featureKey,
      ...data
    }
  })
}

export function getBrowserPages() {
  return request({ url: '/browser/pages', method: 'get' })
}

export function executeBrowserDebug(data) {
  return request({ url: '/browser/debug', method: 'post', data })
}

export function listBrowserProfiles() {
  return request({ url: '/browser/profiles', method: 'get' })
}

export function createBrowserProfile(data) {
  return request({ url: '/browser/profiles', method: 'post', data })
}

export function updateBrowserProfile(profileId, data) {
  return request({ url: `/browser/profiles/${encodeURIComponent(profileId)}`, method: 'put', data })
}

export function deleteBrowserProfile(profileId) {
  return request({ url: `/browser/profiles/${encodeURIComponent(profileId)}`, method: 'delete' })
}

export function switchBrowserProfile(profileId) {
  return request({ url: `/browser/profiles/${encodeURIComponent(profileId)}/switch`, method: 'post', data: {} })
}

export function openBrowserUserDataDir(dirPath, ensureExists = true) {
  return request({
    url: '/browser/open-user-data-dir',
    method: 'post',
    data: { dirPath, ensureExists }
  })
}
