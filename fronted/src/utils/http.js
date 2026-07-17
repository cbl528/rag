/**
 * HTTP 请求工具 —— 带请求/响应拦截器的 fetch 封装
 *
 * 🔵 请求拦截器：自动给非白名单请求添加 token
 * 🟢 响应拦截器：自动解包后端 Result<T> 结构，调用方无需再取 .data
 *
 * 使用方式：
 *   import { http } from '../utils/http'
 *   const data = await http.get('/api/xxx')
 *   const data = await http.post('/api/xxx', { ... })
 */

// 不需要添加 token 的路径前缀
const TOKEN_WHITE_LIST = ['/api/v1/auth/login', '/api/v1/auth/logout']

// localStorage 中用户信息的存储 key（与 AuthContext 保持一致）
const STORAGE_KEY = 'rag_auth_user'

/**
 * 从 localStorage 读取 token
 */
function getToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed.token || null
    }
  } catch {
    // 数据损坏时静默处理
  }
  return null
}

/**
 * 核心请求方法
 */
async function request(url, options = {}) {
  const { headers = {}, ...rest } = options

  /* ======================== 🔵 请求拦截器 ======================== */
  const needsToken = !TOKEN_WHITE_LIST.some((path) => url.startsWith(path))
  if (needsToken) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = token
    }
  }
  /* ============================================================= */

  const response = await fetch(url, { headers, ...rest })

  // 非 JSON 响应直接返回原始 response（如 SSE text/event-stream）
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return response
  }

  const result = await response.json()

  /* ======================== 🟢 响应拦截器 ======================== */
  // 只有后端返回了标准 Result 结构才做解包
  if (result && result.code !== undefined) {
    // token 失效 → 自动登出并跳转登录页
    if (result.code === '401') {
      localStorage.removeItem(STORAGE_KEY)
      window.location.href = '/login'
      throw new Error('登录已过期，请重新登录')
    }

    if (result.code !== '0') {
      const err = new Error(result.message || '请求失败')
      err.code = result.code
      throw err
    }

    return result.data // 直接返回 data，调用方不用再 .data
  }
  /* ============================================================= */

  return result
}

/**
 * 导出的便捷方法
 */
export const http = {
  get(url, options) {
    const { query, ...rest } = options || {}
    let finalUrl = url
    if (query) {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, v)
        }
      })
      const qs = params.toString()
      if (qs) finalUrl = `${url}?${qs}`
    }
    return request(finalUrl, { ...rest, method: 'GET' })
  },

  post(url, data, options) {
    return request(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(data),
    })
  },

  put(url, data, options) {
    return request(url, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(data),
    })
  },

  delete(url, options) {
    return request(url, { ...options, method: 'DELETE' })
  },

  /** 获取当前 token */
  getToken,

  /**
   * 构造带 token 的 SSE URL（EventSource 无法设置请求头，token 通过 URL 参数传递）
   * 后端 sa-token.token-name = Authorization，Sa-Token 按参数名读取
   */
  getSseUrl(baseUrl, params = {}) {
    const token = getToken()
    const query = new URLSearchParams(params)
    if (token) {
      query.set('Authorization', token)
    }
    return `${baseUrl}?${query.toString()}`
  },

  /**
   * 上传文件（FormData 专用，不 JSON 序列化 body）
   */
  upload(url, formData, options) {
    return request(url, {
      ...options,
      method: 'POST',
      body: formData,
      // 不设置 Content-Type，让浏览器自动设置带 boundary 的 multipart/form-data
    })
  },
}
