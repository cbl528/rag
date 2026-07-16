import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, LogIn, User, PanelLeft, MoreHorizontal, Trash2, PencilLine } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { http } from '../utils/http'
import ConfirmDialog from './ConfirmDialog'

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
  onRefreshConversations,
  onOpenRename,
}) {
  const groups = useMemo(() => groupByDate(conversations), [conversations])
  const { user, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [hoveredId, setHoveredId] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)

  // 删除弹窗
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // 点击外部关闭菜单
  useEffect(() => {
    if (!menuOpenId) return
    const handleClick = (e) => {
      if (!e.target.closest('[data-menu-id]')) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpenId])

  // —— 删除 ——
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await http.delete(`/api/v1/conversation/${deleteTarget}`)
      setDeleteTarget(null)
      // 如果删除的是当前会话，通知父组件刷新列表
      onRefreshConversations?.()
    } catch (e) {
      console.error('删除失败', e)
    } finally {
      setDeleting(false)
      setMenuOpenId(null)
    }
  }

  const openDelete = (convId) => {
    setDeleteTarget(convId)
    setMenuOpenId(null)
  }

  const navItemCls = (id) =>
    `group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 text-[13px] ${
      currentId === id
        ? 'bg-gray-200/70 dark:bg-white/10 font-semibold'
        : 'hover:bg-gray-200/40 dark:hover:bg-white/5 font-normal'
    }`

  const sectionLabelCls =
    'text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 mb-1'

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
                  <p className={sectionLabelCls}>{g.label}</p>
                  {g.data.map((conv) => (
                    <div
                      key={conv.id}
                      className={navItemCls(conv.id)}
                      onClick={() => onSelectChat(conv.id)}
                      onMouseEnter={() => setHoveredId(conv.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <MessageSquare size={14} className="shrink-0 text-gray-400" />
                      <span className="truncate flex-1 text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
                        {conv.title}
                      </span>

                      {/* 三点按钮 — 悬浮或菜单打开时显示 */}
                      {(hoveredId === conv.id || menuOpenId === conv.id) && (
                        <button
                          data-menu-id={conv.id}
                          className="shrink-0 p-1 rounded-md
                            text-gray-400 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]
                            hover:bg-black/10 dark:hover:bg-white/10
                            transition-all duration-150"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                          }}
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      )}

                      {/* 下拉菜单 — 内嵌在列表项中 */}
                      {menuOpenId === conv.id && (
                        <div
                          data-menu-id={conv.id}
                          className="fixed z-40 w-[140px] py-1 rounded-xl
                            bg-white dark:bg-[#1c1c1e]
                            shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]
                            border border-[#e5e5e5] dark:border-[#333]
                            animate-fade-in-up"
                          style={{ top: -9999, left: -9999 }}
                          ref={(el) => {
                            if (!el) return
                            // 首次渲染时定位到三点按钮下方
                            if (el.style.top === '-9999px') {
                              const btn = document.querySelector(`[data-menu-id="${conv.id}"]`)
                              if (btn) {
                                const rect = btn.getBoundingClientRect()
                                const menuW = 140
                                // 菜单右对齐到按钮
                                let left = rect.right - menuW
                                // 不超出左侧边界
                                if (left < 8) left = 8
                                el.style.left = `${left}px`
                                el.style.top = `${rect.bottom + 4}px`
                              }
                            }
                          }}
                        >
                          {/* 重命名 */}
                          <button
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px]
                              text-[#1d1d1f] dark:text-[#f5f5f7]
                              hover:bg-gray-100 dark:hover:bg-white/10
                              transition-colors duration-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpenId(null)
                              onOpenRename(conv.id, conv.title)
                            }}
                          >
                            <PencilLine size={14} className="text-gray-400" />
                            重命名
                          </button>

                          {/* 删除 */}
                          <button
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px]
                              text-red-600 dark:text-red-400
                              hover:bg-red-50 dark:hover:bg-red-500/10
                              transition-colors duration-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDelete(conv.id)
                            }}
                          >
                            <Trash2 size={14} />
                            删除
                          </button>
                        </div>
                      )}
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
                <LogIn size={14} />
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

      {/* ====== 删除确认弹窗 ====== */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除对话"
        description="您确定要删除该对话吗，一旦删除无法恢复。"
        confirmLabel="删除"
        confirmDanger
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteTarget(null); setMenuOpenId(null) }}
      />

    </aside>
  )
}
