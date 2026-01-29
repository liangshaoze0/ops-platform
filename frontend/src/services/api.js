import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      
      // 对于偏好设置接口，静默处理，不跳转，不清除 token（可能只是未登录）
      if (url.includes('/preference')) {
        // 如果当前不在登录页，且没有 token，说明是未登录状态，静默处理
        const token = localStorage.getItem('token')
        if (!token || window.location.pathname === '/login' || window.location.pathname === '/register') {
          return Promise.reject(error)
        }
        // 如果有 token 但返回 401，说明 token 无效，清除它
        localStorage.removeItem('token')
        return Promise.reject(error)
      }
      
      // 其他接口的 401 错误，清除 token 并跳转到登录页
      localStorage.removeItem('token')
      // 避免在登录页和注册页跳转
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
