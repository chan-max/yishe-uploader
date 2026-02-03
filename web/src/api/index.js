import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 60000
})

request.interceptors.request.use(
  config => config,
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  response => {
    if (response.status === 200) return response.data
    return Promise.reject(new Error(response.data?.message || '请求失败'))
  },
  error => {
    console.error('响应错误:', error)
    return Promise.reject(error)
  }
)

export default request
