import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, Upload, Users, ArrowLeft, ChevronRight } from 'lucide-react'

const navItems = [
  { path: '/admin', label: '首页', icon: Home },
  { path: '/admin/upload', label: '文档上传', icon: Upload },
  { path: '/admin/users', label: '用户管理', icon: Users },
]

export default function AdminLayout({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // 页面访问历史（面包屑用）
  const [visitedPages, setVisitedPages] = useState(() => {
    const label = navItems.find(i => i.path === location.pathname)?.label || '首页'
    return [{ path: location.pathname, label }]
  })

  // 同步 URL 变化到面包屑
  useEffect(() => {
    setVisitedPages(prev => {
      const currentPath = location.pathname
      const last = prev[prev.length - 1]
      if (last.path === currentPath) return prev
      const idx = prev.findIndex(p => p.path === currentPath)
      if (idx !== -1) return prev.slice(0, idx + 1)
      // 新路径追加
      const label = navItems.find(i => i.path === currentPath)?.label || '未知'
      return [...prev, { path: currentPath, label }]
    })
  }, [location.pathname])

  // 带历史记录的导航
  const navigateTo = useCallback((path) => {
    const label = navItems.find(i => i.path === path)?.label || '未知'
    setVisitedPages(prev => {
      const idx = prev.findIndex(p => p.path === path)
      if (idx !== -1) return prev.slice(0, idx + 1)
      return [...prev, { path, label }]
    })
    navigate(path)
  }, [navigate])

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('http') || avatar.startsWith('/')) return avatar
    return avatar
  }

  if (user?.role !== 'admin') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-[#141414]">
        <p className="text-[14px] text-gray-500 dark:text-gray-400">无权访问</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#141414]">
      {/* ========== 左侧导航 ========== */}
      <aside className="w-[220px] shrink-0 flex flex-col border-r border-[#e5e5e5] dark:border-[#222] bg-[#f9f9f9] dark:bg-[#111]">
        {/* 顶部：返回聊天 */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-[#e5e5e5] dark:border-[#222]">
          <button
            onClick={() => navigate('/')}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="返回聊天"
          >
            <ArrowLeft size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
          <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 select-none">
            管理控制台
          </span>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigateTo(item.path)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] transition-colors ${
                location.pathname === item.path
                  ? 'bg-gray-200/70 dark:bg-white/10 text-[#1d1d1f] dark:text-[#f5f5f7]'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/40 dark:hover:bg-white/5'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* 底部：用户信息 */}
        <div className="px-3 py-3 border-t border-[#e5e5e5] dark:border-[#222]">
          <div className="text-[12px] text-gray-400 dark:text-gray-500 px-2 truncate">
            {user?.username}
          </div>
        </div>
      </aside>

      {/* ========== 右侧内容区 ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* -------- 顶部导航栏 -------- */}
        <div className="flex items-center justify-between h-12 px-6 border-b border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#141414] shrink-0">
          {/* 左侧：面包屑 */}
          <div className="flex items-center gap-1 text-[13px]">
            {visitedPages.map((p, i) => (
              <span key={p.path} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={14} className="text-gray-400" />}
                <button
                  onClick={() => navigateTo(p.path)}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    i === visitedPages.length - 1
                      ? 'text-[#1d1d1f] dark:text-[#f5f5f7] font-medium'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              </span>
            ))}
          </div>

          {/* 右侧：用户信息 */}
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-gray-500 dark:text-gray-400">
              {user?.nickname || user?.username}
            </span>
            {user?.avatar ? (
              <img
                src={getAvatarUrl(user.avatar)}
                alt="avatar"
                className="w-7 h-7 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div
              className={`w-7 h-7 rounded-full bg-blue-500 text-white text-[11px] font-medium items-center justify-center ${
                user?.avatar ? 'hidden' : 'flex'
              }`}
            >
              {((user?.nickname || user?.username || '?')[0]).toUpperCase()}
            </div>
          </div>
        </div>

        {/* -------- 页面内容 -------- */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#141414]">
          {children}
        </main>
      </div>
    </div>
  )
}
