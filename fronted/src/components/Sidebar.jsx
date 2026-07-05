import { useMemo } from 'react'
import { Plus, MessageSquare, Sun, Moon, PanelLeft } from 'lucide-react'

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
  darkMode,
  onNewChat,
  onSelectChat,
  onToggleSidebar,
  onToggleDark,
}) {
  const groups = useMemo(() => groupByDate(conversations), [conversations])

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

        {/* New Chat */}
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

        {/* Conversation List */}
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

        {/* Footer */}
        <div className="px-3 pb-3 pt-2">
          <button
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg
              hover:bg-gray-200/40 dark:hover:bg-white/5 transition-colors duration-150
              text-[13px] text-gray-500 dark:text-gray-400"
            onClick={onToggleDark}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span>{darkMode ? '浅色模式' : '深色模式'}</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
