import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Upload, ArrowLeft } from 'lucide-react'

const navItems = [
  { path: '/admin/upload', label: '文档上传', icon: Upload },
]

export default function AdminLayout({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (user?.role !== 'admin') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-[#141414]">
        <p className="text-[14px] text-gray-500 dark:text-gray-400">无权访问</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#141414]">
      {/* 左侧导航 */}
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
              onClick={() => navigate(item.path)}
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

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-[#141414]">
        {children}
      </main>
    </div>
  )
}
