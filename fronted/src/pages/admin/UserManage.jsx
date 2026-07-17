import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, UserPlus, Edit3, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { http } from '../../utils/http'

const AVATAR_BASE = import.meta.env.VITE_API_BASE || ''

export default function UserManage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10
  const searchTimer = useRef(null)

  const fetchUsers = useCallback(async (searchKeyword, currentPage) => {
    setLoading(true)
    setError(null)
    try {
      const params = { page: currentPage, size: pageSize }
      if (searchKeyword?.trim()) {
        params.keyword = searchKeyword.trim()
      }
      const data = await http.get('/api/v1/users', { query: params })
      setUsers(data.records || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError(e.message || '加载用户列表失败')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    fetchUsers('', 1)
  }, [fetchUsers])

  // 搜索防抖
  const handleSearchChange = (e) => {
    const val = e.target.value
    setKeyword(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchUsers(val, 1)
    }, 300)
  }

  // 分页
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const goPage = (p) => {
    if (p < 1 || p > totalPages) return
    setPage(p)
    fetchUsers(keyword, p)
  }

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('http') || avatar.startsWith('/')) return avatar
    return `${AVATAR_BASE}${avatar}`
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-6">
        用户管理
      </h1>

      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-6 gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={keyword}
            onChange={handleSearchChange}
            placeholder="搜索用户名或昵称…"
            className="w-full pl-9 pr-4 py-2 text-[14px] rounded-lg
              bg-[#f5f5f7] dark:bg-[#1c1c1e]
              text-[#1d1d1f] dark:text-[#f5f5f7]
              placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
              border border-transparent
              focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
              transition-colors duration-200"
          />
        </div>

        {/* 新增用户按钮 */}
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-medium
            bg-blue-600 text-white hover:bg-blue-700
            transition-colors duration-200"
        >
          <UserPlus size={16} />
          新增用户
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-[13px] text-red-700 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && users.length === 0 && (
        <div className="text-center py-20">
          <p className="text-[14px] text-gray-400 dark:text-gray-500">
            {keyword ? '未找到匹配的用户' : '暂无用户数据'}
          </p>
        </div>
      )}

      {/* 用户列表表格 */}
      {!loading && users.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-[#e5e5e5] dark:border-[#333]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f5f5f7] dark:bg-[#1c1c1e] text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">头像</th>
                  <th className="text-left px-4 py-3 font-medium">用户名</th>
                  <th className="text-left px-4 py-3 font-medium">昵称</th>
                  <th className="text-left px-4 py-3 font-medium">角色</th>
                  <th className="text-left px-4 py-3 font-medium">账号状态</th>
                  <th className="text-left px-4 py-3 font-medium">创建时间</th>
                  <th className="text-left px-4 py-3 font-medium">上次登录</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#333]">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-[#f9f9f9] dark:hover:bg-[#1c1c1e]/50 transition-colors"
                  >
                    {/* 头像 */}
                    <td className="px-4 py-3">
                      {u.avatar ? (
                        <img
                          src={getAvatarUrl(u.avatar)}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-8 h-8 rounded-full bg-blue-500 text-white text-[12px] font-medium items-center justify-center ${u.avatar ? 'hidden' : 'flex'}`}
                      >
                        {(u.nickname || u.username || '?')[0].toUpperCase()}
                      </div>
                    </td>
                    {/* 用户名 */}
                    <td className="px-4 py-3 text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {u.username}
                    </td>
                    {/* 昵称 */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {u.nickname || '-'}
                    </td>
                    {/* 角色 */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[12px] font-medium ${
                        u.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>
                        {u.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    {/* 账号状态 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] font-medium ${
                        u.status === 1
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300'
                          : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.status === 1 ? 'bg-red-500' : 'bg-green-500'
                        }`} />
                        {u.status === 1 ? '禁用' : '正常'}
                      </span>
                    </td>
                    {/* 创建时间 */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {u.createTime ? new Date(u.createTime).toLocaleString('zh-CN', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      }) : '-'}
                    </td>
                    {/* 上次登录 */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString('zh-CN', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      }) : '-'}
                    </td>
                    {/* 操作 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {}}
                          className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] text-gray-400 hover:text-blue-500 transition-colors"
                          title="编辑"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => {}}
                          className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] text-gray-400 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-[13px] text-gray-500 dark:text-gray-400">
              <span>共 {total} 条，第 {page}/{totalPages} 页</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  // 当前页居中
                  let start = Math.max(1, page - 3)
                  const end = Math.min(totalPages, start + 6)
                  if (end - start < 6) start = Math.max(1, end - 6)
                  const p = start + i
                  if (p > totalPages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      className={`w-8 h-8 rounded-lg text-center transition-colors ${
                        p === page
                          ? 'bg-[#1d1d1f] dark:bg-[#f5f5f7] text-white dark:text-[#1d1d1f]'
                          : 'hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e]'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
