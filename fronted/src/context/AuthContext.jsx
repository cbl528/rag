import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { http } from '../utils/http'

const AuthContext = createContext(null)

const STORAGE_KEY = 'rag_auth_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 恢复本地持久化的登录会话
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.token) {
          setUser(parsed)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (username, password, rememberMe) => {
    // http.post 自动处理 JSON 序列化和响应解包
    const userData = await http.post('/api/v1/auth/login', { username, password })

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }

    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try {
      await http.post('/api/v1/auth/logout')
    } catch {
      // 即使请求失败也清除本地状态
    }
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const userInfo = await http.get('/api/v1/auth/me')
      setUser((prev) => {
        const updated = { ...prev, ...userInfo }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        return updated
      })
      return userInfo
    } catch {
      return null
    }
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isLoggedIn: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
