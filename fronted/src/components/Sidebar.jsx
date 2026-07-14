import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, LogIn, LogOut, User, PanelLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function groupByDate(convs) {
  const now = new Date()
  const today = []
  const yesterday = []
  const earlier = []
  convs.forEach((c) => {
    const d = new Date(c.createdAt)
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) today.push(c)
    else if (diffDays === 1) yesterday.push(c)
    else earlier.push(c)
  })
  return { today, yesterday, earlier }
}

export default function Sidebar({
  conversations,
  currentId,
  collapsed,
  onNewChat,
  onSelectChat,
  onToggleSidebar,
  onLogout,
}) {
  const groups = useMemo(() => groupByDate(conversations), [conversations])
  const { user, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const navItemCls = (id) =>
    `flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 text-[13px] ${
      currentId === id
        ? 'bg-gray-200/70 dark:bg-white/10'
        : 'hover:bg-gray-200/40 dark:hover:bg-white/5'
    }`

  return (
    <aside
      className={`flex flex-col h-full transition-all duration-250 ease-out overflow-hidden shrink-0
        bg-[#f9f9f9] dark:bg-[#111] ${collapsed ? 'w-0' : 'w-[260px]'}`}
    >
      <div className="flex flex-col h-full min-w-[260px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <span className="text-[13px] font-semibold tracking-tight text-gray-500 dark:text-gray-400 select-none">
            RAG Studio
          </span>
          <button
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            onClick={onToggleSidebar}
          >
            <PanelLeft size={16} className="text-gray-400" />
          </button>
        </div>

        {/* 新对话 */}
        <div className="px-3 pt-3 pb-2">
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[14px]
              bg-white dark:bg-[#1c1c1c] hover:bg-gray-50 dark:hover:bg-[#222]
              transition-colors duration-150
              text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]"
            onClick={onNewChat}
          >
            <Plus size={18} />
            <span>新对话</span>
          </button>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto px-3">
          {[
            { key: 'today', label: '今天', data: groups.today },
            { key: 'yesterday', label: '昨天', data: groups.yesterday },
            { key: 'earlier', label: '更早', data: groups.earlier },
          ].map(
            (g) =>
              g.data.length > 0 && (
                <div key={g.key} className="mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 mb-1">
                    {g.label}
                  </p>
                  {g.data.map((conv) => (
                    <div
                      key={conv.id}
                      className={navItemCls(conv.id)}
                      onClick={() => onSelectChat(conv.id)}
                    >
                      <MessageSquare size={14} className="shrink-0 text-gray-400" />
                      <span className="truncate flex-1 text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
                        {conv.title}
                      </span>
                    </div>
                  ))}
                </div>
              ),
          )}
        </div>

        {/* 底部 — 登录 / 用户信息 */}
        <div className="px-3 pb-3 pt-2 border-t border-[#e5e5e5] dark:border-[#222]">
          {isLoggedIn ? (
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg
              text-[13px] text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shrink-0">
                  <User size={13} className="text-white" />
                </div>
                <span className="truncate text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
                  {user?.username || '用户'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="退出登录"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg
                hover:bg-gray-200/40 dark:hover:bg-white/5 transition-colors duration-150
                text-[13px] text-gray-500 dark:text-gray-400"
              onClick={() => navigate('/login')}
            >
              <LogIn size={16} />
              <span>请先进行登录</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
