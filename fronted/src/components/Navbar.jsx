import { PanelLeft, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ title, sidebarCollapsed, onToggleSidebar, darkMode, onToggleDark }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  return (
    <header
      className="shrink-0 flex items-center justify-between h-12 px-3
        bg-white/80 dark:bg-[#141414]/80 backdrop-blur-lg
        border-b border-[#e5e5e5] dark:border-[#222]
        transition-colors duration-200 select-none"
    >
      {/* 左侧 — 侧边栏切换 */}
      <div className="w-[100px] flex items-center">
        {sidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="展开侧边栏"
          >
            <PanelLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* 中间 — 会话标题 */}
      <div className="flex-1 text-center min-w-0">
        <h1 className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate px-4">
          {title || '新对话'}
        </h1>
      </div>

      {/* 右侧 — 管理端 + 深浅模式切换 */}
      <div className="w-[100px] flex items-center justify-end gap-1">
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="px-4 h-8 rounded-lg text-[13px] font-medium
              bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f]
              hover:opacity-80 transition-opacity duration-150"
            title="进入控制台"
          >
            进入控制台
          </button>
        )}
        <button
          onClick={onToggleDark}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title={darkMode ? '浅色模式' : '深色模式'}
        >
          {darkMode ? <Sun size={18} className="text-gray-500 dark:text-gray-400" /> : <Moon size={18} className="text-gray-500 dark:text-gray-400" />}
        </button>
      </div>
    </header>
  )
}
