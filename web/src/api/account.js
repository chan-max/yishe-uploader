import request from './index'

export function getAccounts(params) {
  return request({ url: '/accounts', method: 'get', params })
}

export function addAccount(data) {
  return request({ url: '/accounts', method: 'post', data })
}

export function updateAccount(id, data) {
  return request({ url: `/accounts/${id}`, method: 'put', data })
}

export function deleteAccount(id) {
  return request({ url: `/accounts/${id}`, method: 'delete' })
}

export function checkLoginStatus(platform) {
  return request({ url: `/accounts/check-login/${platform}`, method: 'get' })
}

export function refreshAccountCookie(id) {
  return request({ url: `/accounts/${id}/refresh`, method: 'post' })
}
