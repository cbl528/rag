import { PanelLeft, Sun, Moon, PencilLine } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ title, sidebarCollapsed, onToggleSidebar, darkMode, onToggleDark, currentId, onOpenRename }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  return (
    <header
      className="shrink-0 flex items-center justify-between h-14 px-4
        bg-white/80 dark:bg-[#141414]/80 backdrop-blur-xl
        border-b border-[#e5e5e5] dark:border-[#222]
        transition-colors duration-200 select-none"
    >
      {/* 左侧 */}
      <div className="w-[120px] flex items-center gap-1">
        {sidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="展开侧边栏"
          >
            <PanelLeft size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        )}
        {currentId && title && (
          <button
            onClick={() => onOpenRename(currentId, title)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="重命名对话"
          >
            <PencilLine size={17} className="text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* 中间 */}
      <div className="flex-1 text-center min-w-0">
        <h1 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] truncate px-4 tracking-tight">
          {title || '新对话'}
        </h1>
      </div>

      {/* 右侧 */}
      <div className="w-[150px] flex items-center justify-end gap-2">
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="px-5 h-9 rounded-xl text-[14px] font-semibold
              bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f]
              hover:opacity-85 active:scale-[0.97] transition-all duration-150
              shadow-sm"
            title="进入控制台"
          >
            控制台
          </button>
        )}
        <button
          onClick={onToggleDark}
          className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title={darkMode ? '浅色模式' : '深色模式'}
        >
          {darkMode ? <Sun size={19} className="text-gray-500 dark:text-gray-400" /> : <Moon size={19} className="text-gray-500 dark:text-gray-400" />}
        </button>
      </div>
    </header>
  )
}
