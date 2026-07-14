import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, EyeOff, Eye } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('123456')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, isLoggedIn, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // 等待认证状态初始化
  if (authLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-white dark:bg-[#141414] transition-colors duration-200">
        <div className="w-6 h-6 border-2 border-[#1d1d1f] dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 如果已登录（记住密码恢复会话），跳回首页
  if (isLoggedIn) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }

    setLoading(true)
    try {
      await login(username, password, rememberMe)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-screen flex bg-white dark:bg-[#141414] transition-colors duration-200">
      {/* 左侧 — 品牌展示区域，大屏可见 */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#f5f5f7] dark:bg-[#111]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#1d1d1f] dark:bg-white mx-auto mb-6 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white dark:text-[#1d1d1f]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
            RAG Studio
          </h2>
          <p className="text-[15px] text-[#86868b] dark:text-[#98989d] mt-2 max-w-[280px] mx-auto leading-relaxed">
            智能知识检索与问答平台
          </p>
        </div>
      </div>

      {/* 右侧 — 登录表单 */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-[380px]">
          {/* 移动端品牌标题 */}
          <div className="lg:hidden text-center mb-10">
            <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              欢迎回来
            </h2>
            <p className="text-[14px] text-[#86868b] dark:text-[#98989d] mt-1">
              请登录以继续使用 RAG Studio
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名 */}
            <div>
              <label className="block text-[13px] font-medium text-[#86868b] dark:text-[#98989d] mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                disabled={loading}
                className="w-full px-4 py-3 text-[15px] rounded-xl
                  bg-white dark:bg-[#1c1c1e]
                  text-[#1d1d1f] dark:text-[#f5f5f7]
                  placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                  border border-[#e5e5e5] dark:border-[#333]
                  focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                  transition-colors duration-200 disabled:opacity-50"
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-[13px] font-medium text-[#86868b] dark:text-[#98989d] mb-1.5">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full px-4 py-3 text-[15px] rounded-xl pr-11
                    bg-white dark:bg-[#1c1c1e]
                    text-[#1d1d1f] dark:text-[#f5f5f7]
                    placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                    border border-[#e5e5e5] dark:border-[#333]
                    focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                    transition-colors duration-200 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-[#aeaeb2] dark:text-[#636366]
                    hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 记住密码 */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => !loading && setRememberMe(!rememberMe)}
                className="flex items-center gap-2 cursor-pointer select-none group"
              >
                <div
                  className={`w-4 h-4 rounded-[4px] border transition-all duration-150 flex items-center justify-center
                    ${rememberMe
                      ? 'bg-[#1d1d1f] dark:bg-white border-[#1d1d1f] dark:border-white'
                      : 'border-[#aeaeb2] dark:border-[#636366] group-hover:border-[#1d1d1f] dark:group-hover:border-[#f5f5f7]'
                    }`}
                >
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white dark:text-[#1d1d1f]" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6l2.5 2.5 4.5-5" />
                    </svg>
                  )}
                </div>
                <span className="text-[13px] text-[#86868b] dark:text-[#98989d] group-hover:text-[#1d1d1f] dark:group-hover:text-[#f5f5f7] transition-colors duration-150">
                  记住密码
                </span>
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-[13px] text-red-500 dark:text-red-400
                bg-red-50 dark:bg-red-500/10
                rounded-xl px-4 py-2.5
                border border-red-100 dark:border-red-500/20">
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-[15px] font-medium
                bg-[#1d1d1f] dark:bg-white
                text-white dark:text-[#1d1d1f]
                hover:opacity-85 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  登录中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  登录
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          {/* 底部信息 */}
          <p className="text-center text-[12px] text-[#aeaeb2] dark:text-[#636366] mt-8">
            RAG Studio · 智能知识检索与问答平台
          </p>
        </div>
      </div>
    </div>
  )
}
