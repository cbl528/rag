import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageCircleMore, LogIn, User, PanelLeft, MoreHorizontal, Trash2, PencilLine, Settings, LogOut, Search, X } from 'lucide-react'
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
  onOpenProfile,
}) {
  const { user, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimerRef = useRef(null)

  const doSearch = useCallback(async (keyword) => {
    if (!keyword.trim()) { setSearchResults(null); return }
    setIsSearching(true)
    try {
      const data = await http.get(`/api/v1/conversation/search/${encodeURIComponent(keyword.trim())}`)
      setSearchResults((data || []).map((item) => ({
        id: item.sessionId, title: item.title, createdAt: item.createTime, lastTime: item.lastTime,
      })))
    } catch { setSearchResults([]) }
    finally { setIsSearching(false) }
  }, [])

  const handleSearchChange = (value) => {
    setSearchKeyword(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => doSearch(value), 300)
  }

  const clearSearch = () => {
    setSearchKeyword('')
    setSearchResults(null)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
  }

  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }, [])

  const displayConvs = searchResults !== null ? searchResults : conversations
  const groups = useMemo(() => groupByDate(displayConvs), [displayConvs])

  const [hoveredId, setHoveredId] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!menuOpenId && !userMenuOpen) return
    const handleClick = (e) => {
      if (menuOpenId && !e.target.closest('[data-menu-id]')) setMenuOpenId(null)
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpenId, userMenuOpen])

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await http.delete(`/api/v1/conversation/${deleteTarget}`)
      setDeleteTarget(null)
      onRefreshConversations?.()
    } catch (e) { console.error('删除失败', e) }
    finally { setDeleting(false); setMenuOpenId(null) }
  }

  const openDelete = (convId) => { setDeleteTarget(convId); setMenuOpenId(null) }

  const navItemCls = (id) =>
    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-[14px] ${
      currentId === id
        ? 'bg-gray-200/60 dark:bg-white/10 font-semibold shadow-sm'
        : 'hover:bg-gray-200/30 dark:hover:bg-white/5 font-medium'
    }`

  const sectionLabelCls =
    'text-[12px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-3 mb-1.5'

  return (
    <aside
      className={`flex flex-col h-full transition-all duration-250 ease-out overflow-hidden shrink-0
        bg-[#f9f9f9] dark:bg-[#111] ${collapsed ? 'w-0' : 'w-[280px]'}`}
    >
      <div className="flex flex-col h-full min-w-[280px]">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="text-[15px] font-bold tracking-tight text-gray-500 dark:text-gray-400 select-none">
            RAG Studio
          </span>
          <button
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            onClick={onToggleSidebar}
          >
            <PanelLeft size={18} className="text-gray-400" />
          </button>
        </div>

        {/* ---- 搜索 ---- */}
        <div className="px-4 pt-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2] dark:text-[#636366] pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索历史对话..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-[14px]
                bg-white dark:bg-[#1c1c1c]
                text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-transparent
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
            {searchKeyword && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded
                  text-[#aeaeb2] dark:text-[#636366]
                  hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]
                  transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ---- 新对话 ---- */}
        <div className="px-4 pt-4 pb-3">
          <button
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[15px] font-semibold
              bg-white dark:bg-[#1c1c1c] hover:bg-gray-50 dark:hover:bg-[#222]
              border border-[#e5e5e5] dark:border-[#2a2a2a]
              shadow-sm hover:shadow-md
              transition-all duration-150
              text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]"
            onClick={onNewChat}
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>新对话</span>
          </button>
        </div>

        {/* ---- 对话列表 ---- */}
        <div className="flex-1 overflow-y-auto px-4">
          {[
            { key: 'today', label: '今天', data: groups.today },
            { key: 'yesterday', label: '昨天', data: groups.yesterday },
            { key: 'earlier', label: '更早', data: groups.earlier },
          ].map(
            (g) =>
              g.data.length > 0 && (
                <div key={g.key} className="mb-4">
                  <p className={sectionLabelCls}>{g.label}</p>
                  {g.data.map((conv) => (
                    <div
                      key={conv.id}
                      className={navItemCls(conv.id)}
                      onClick={() => onSelectChat(conv.id)}
                      onMouseEnter={() => setHoveredId(conv.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <MessageCircleMore size={16} strokeWidth={1.5} className="shrink-0 text-gray-400" />
                      <span className="truncate flex-1 text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
                        {conv.title}
                      </span>

                      {(hoveredId === conv.id || menuOpenId === conv.id) && (
                        <button
                          data-menu-id={conv.id}
                          className="shrink-0 p-1 rounded-lg
                            text-gray-400 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]
                            hover:bg-black/10 dark:hover:bg-white/10
                            transition-all duration-150"
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conv.id ? null : conv.id) }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      )}

                      {menuOpenId === conv.id && (
                        <div
                          data-menu-id={conv.id}
                          className="fixed z-40 w-[150px] py-1.5 rounded-2xl
                            bg-white dark:bg-[#1c1c1e]
                            shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                            border border-[#e5e5e5] dark:border-[#333]
                            animate-fade-in-up"
                          style={{ top: -9999, left: -9999 }}
                          ref={(el) => {
                            if (!el) return
                            if (el.style.top === '-9999px') {
                              const btn = document.querySelector(`[data-menu-id="${conv.id}"]`)
                              if (btn) {
                                const rect = btn.getBoundingClientRect()
                                const menuW = 150
                                let left = rect.right - menuW
                                if (left < 8) left = 8
                                el.style.left = `${left}px`
                                el.style.top = `${rect.bottom + 6}px`
                              }
                            }
                          }}
                        >
                          <button
                            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-[14px] font-medium
                              text-[#1d1d1f] dark:text-[#f5f5f7]
                              hover:bg-gray-100 dark:hover:bg-white/10
                              transition-colors duration-100"
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onOpenRename(conv.id, conv.title) }}
                          >
                            <PencilLine size={15} className="text-gray-400" />
                            重命名
                          </button>
                          <button
                            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-[14px] font-medium
                              text-red-600 dark:text-red-400
                              hover:bg-red-50 dark:hover:bg-red-500/10
                              transition-colors duration-100"
                            onClick={(e) => { e.stopPropagation(); openDelete(conv.id) }}
                          >
                            <Trash2 size={15} />
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

        {/* ---- 底部用户 ---- */}
        <div ref={userMenuRef} className="px-4 pb-4 pt-3 border-t border-[#e5e5e5] dark:border-[#222] relative">
          {isLoggedIn ? (
            <>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl
                  text-[14px] text-gray-500 dark:text-gray-400
                  hover:bg-gray-200/40 dark:hover:bg-white/5
                  transition-colors duration-150"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 ring-2 ring-[#e5e5e5] dark:ring-[#333]" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1d1d1f] to-[#555] dark:from-[#f5f5f7] dark:to-[#999] flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-semibold text-white dark:text-[#1d1d1f]">
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                  )}
                  <span className="truncate text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)] font-medium">
                    {user?.nickname || user?.username || '用户'}
                  </span>
                </div>
                <MoreHorizontal size={15} className="shrink-0 text-gray-400" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute left-4 right-4 bottom-full mb-2 z-40 py-1.5 rounded-2xl
                    bg-white dark:bg-[#1c1c1e]
                    shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                    border border-[#e5e5e5] dark:border-[#333]
                    animate-fade-in-up"
                >
                  <button
                    className="flex items-center gap-3 w-full px-3.5 py-2.5 text-[14px] font-medium
                      text-[#1d1d1f] dark:text-[#f5f5f7]
                      hover:bg-gray-100 dark:hover:bg-white/10
                      transition-colors duration-100"
                    onClick={() => { setUserMenuOpen(false); onOpenProfile?.() }}
                  >
                    <Settings size={15} className="text-gray-400" />
                    个人中心
                  </button>
                  <button
                    className="flex items-center gap-3 w-full px-3.5 py-2.5 text-[14px] font-medium
                      text-red-600 dark:text-red-400
                      hover:bg-red-50 dark:hover:bg-red-500/10
                      transition-colors duration-100"
                    onClick={() => { setUserMenuOpen(false); onLogout() }}
                  >
                    <LogOut size={15} />
                    退出登录
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                hover:bg-gray-200/40 dark:hover:bg-white/5 transition-colors duration-150
                text-[14px] font-medium text-gray-500 dark:text-gray-400"
              onClick={() => navigate('/login')}
            >
              <LogIn size={17} />
              <span>登录</span>
            </button>
          )}
        </div>
      </div>

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
