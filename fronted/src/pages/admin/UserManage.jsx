import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, UserPlus, Edit3, Trash2, Ban, Loader2, AlertCircle } from 'lucide-react'
import { http } from '../../utils/http'
import ConfirmDialog from '../../components/ConfirmDialog'

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

  // 批量选择
  const [selectedIds, setSelectedIds] = useState(new Set())

  // 编辑弹窗
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ nickname: '', password: '', status: 0 })
  const [editing, setEditing] = useState(false)

  // 删除弹窗
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // 批量操作弹窗
  const [batchAction, setBatchAction] = useState(null) // 'disable' | 'delete'
  const [batchProcessing, setBatchProcessing] = useState(false)

  // ---- 数据加载 ----

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
      setSelectedIds(new Set())
    } catch (e) {
      setError(e.message || '加载用户列表失败')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers('', 1)
  }, [fetchUsers])

  // ---- 搜索 ----

  const handleSearchChange = (e) => {
    const val = e.target.value
    setKeyword(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchUsers(val, 1)
    }, 300)
  }

  // ---- 分页 ----

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const goPage = (p) => {
    if (p < 1 || p > totalPages) return
    setPage(p)
    fetchUsers(keyword, p)
  }

  // ---- 选择 ----

  const selectableUsers = users.filter(u => u.username !== 'admin')
  const allSelected = selectableUsers.length > 0 && selectedIds.size === selectableUsers.length

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableUsers.map(u => u.id)))
    }
  }

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ---- 编辑 ----

  const openEdit = (user) => {
    setEditTarget(user)
    setEditForm({
      nickname: user.nickname || '',
      password: '',
      status: user.status ?? 0,
    })
  }

  const handleEditConfirm = async () => {
    if (!editTarget) return
    setEditing(true)
    try {
      const body = { nickname: editForm.nickname, status: editForm.status }
      if (editForm.password) {
        body.password = editForm.password
      }
      await http.put(`/api/v1/auth/admin/users/${editTarget.id}`, body)
      setEditTarget(null)
      fetchUsers(keyword, page)
    } catch (e) {
      setError(e.message || '编辑失败')
    } finally {
      setEditing(false)
    }
  }

  // ---- 删除 ----

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await http.delete(`/api/v1/users/${deleteTarget.id}`)
      setDeleteTarget(null)
      // 如果当前页只剩被删的那一条且不是第1页，回退一页
      if (users.length === 1 && page > 1) {
        fetchUsers(keyword, page - 1)
      } else {
        fetchUsers(keyword, page)
      }
    } catch (e) {
      setError(e.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  // ---- 批量操作 ----

  const handleBatchConfirm = async () => {
    if (!batchAction || selectedIds.size === 0) return
    setBatchProcessing(true)
    try {
      const ids = Array.from(selectedIds)
      if (batchAction === 'delete') {
        await http.delete('/api/v1/auth/admin/users/batch', { ids })
      } else if (batchAction === 'disable') {
        await http.put('/api/v1/auth/admin/users/batch/status', { ids, status: 1 })
      }
      setBatchAction(null)
      fetchUsers(keyword, page)
    } catch (e) {
      setError(e.message || '批量操作失败')
    } finally {
      setBatchProcessing(false)
    }
  }

  // ---- 工具 ----

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('http') || avatar.startsWith('/')) return avatar
    return `${AVATAR_BASE}${avatar}`
  }

  const fmtTime = (t) => {
    if (!t) return '-'
    try {
      return new Date(t).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ====== 页面标题栏 ====== */}
      <div className="px-8 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">用户管理</h1>
      </div>

      {/* ====== 内容区 ====== */}
      <div className="flex-1 overflow-auto px-8 pb-6">
        {/* 工具栏：搜索 + 批量操作 */}
        <div className="flex items-center justify-between mb-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={keyword}
              onChange={handleSearchChange}
              placeholder="搜索用户名或昵称…"
              className="w-72 pl-10 pr-4 py-2 text-[14px] rounded-lg
                bg-[#f5f5f7] dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-transparent
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
          </div>

          {/* 操作按钮组 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBatchAction('disable')}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-[14px] font-medium
                transition-all duration-200
                disabled:opacity-30 disabled:cursor-not-allowed
                bg-amber-50 text-amber-600 hover:bg-amber-100
                dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30
                active:scale-[0.98]"
            >
              <Ban size={15} />
              批量禁用
            </button>
            <button
              onClick={() => setBatchAction('delete')}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-[14px] font-medium
                transition-all duration-200
                disabled:opacity-30 disabled:cursor-not-allowed
                bg-red-50 text-red-600 hover:bg-red-100
                dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30
                active:scale-[0.98]"
            >
              <Trash2 size={15} />
              批量删除
            </button>
            <div className="w-px h-6 bg-[#e5e5e5] dark:bg-[#333]" />
            <button
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-[14px] font-medium
                bg-blue-600 text-white hover:bg-blue-700
                transition-colors duration-200"
            >
              <UserPlus size={16} />
              新增用户
            </button>
          </div>
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

        {/* ====== 用户列表表格 ====== */}
        {!loading && users.length > 0 && (
          <>
            <div className="overflow-hidden rounded-xl border border-[#e5e5e5] dark:border-[#333]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#f5f5f7] dark:bg-[#1c1c1e] text-gray-500 dark:text-gray-400">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600
                          text-blue-600 focus:ring-blue-500 cursor-pointer
                          accent-blue-600"
                      />
                    </th>
                    <th className="w-10 px-2 py-3 text-center font-medium">#</th>
                    <th className="text-left px-3 py-3 font-medium">头像</th>
                    <th className="text-left px-3 py-3 font-medium">用户名</th>
                    <th className="text-left px-3 py-3 font-medium">昵称</th>
                    <th className="text-left px-3 py-3 font-medium">角色</th>
                    <th className="text-left px-3 py-3 font-medium">账号状态</th>
                    <th className="text-left px-3 py-3 font-medium whitespace-nowrap">创建时间</th>
                    <th className="text-left px-3 py-3 font-medium whitespace-nowrap">更新时间</th>
                    <th className="text-left px-3 py-3 font-medium whitespace-nowrap">上次登录</th>
                    <th className="w-24 px-3 py-3 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#333]">
                  {users.map((u, idx) => (
                    <tr
                      key={u.id}
                      className="hover:bg-[#f9f9f9] dark:hover:bg-[#1c1c1e]/50 transition-colors"
                    >
                      {/* 复选框 */}
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleOne(u.id)}
                          disabled={u.username === 'admin'}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600
                            text-blue-600 focus:ring-blue-500
                            accent-blue-600
                            disabled:opacity-30 disabled:cursor-not-allowed
                            cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* 序号 */}
                      <td className="px-2 py-3 text-center text-gray-400 dark:text-gray-500">
                        {(page - 1) * pageSize + idx + 1}
                      </td>

                      {/* 头像 */}
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3 text-[#1d1d1f] dark:text-[#f5f5f7]">{u.username}</td>

                      {/* 昵称 */}
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{u.nickname || '-'}</td>

                      {/* 角色 */}
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[12px] font-medium ${
                          u.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}>
                          {u.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      </td>

                      {/* 账号状态 */}
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtTime(u.createTime)}</td>

                      {/* 更新时间 */}
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtTime(u.updateTime)}</td>

                      {/* 上次登录 */}
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtTime(u.lastLogin)}</td>

                      {/* 操作 */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            disabled={u.username === 'admin'}
                            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] transition-colors
                              disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent
                              text-gray-400 hover:text-blue-500"
                            title={u.username === 'admin' ? '默认管理员不能编辑' : '编辑'}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={u.username === 'admin'}
                            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] transition-colors
                              disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent
                              text-gray-400 hover:text-red-500"
                            title={u.username === 'admin' ? '默认管理员不能删除' : '删除'}
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

      {/* ====== 编辑弹窗 ====== */}
      <ConfirmDialog
        open={!!editTarget}
        title="编辑用户"
        confirmLabel="保存"
        loading={editing}
        onConfirm={handleEditConfirm}
        onCancel={() => setEditTarget(null)}
      >
        <div className="space-y-4">
          {/* 用户名（只读） */}
          <div>
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">用户名</label>
            <div className="px-4 py-2.5 text-[14px] rounded-xl bg-[#f5f5f7] dark:bg-[#2a2a2a] text-gray-400 dark:text-gray-500">
              {editTarget?.username || ''}
            </div>
          </div>

          {/* 昵称 */}
          <div>
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">昵称</label>
            <input
              type="text"
              value={editForm.nickname}
              onChange={(e) => setEditForm(p => ({ ...p, nickname: e.target.value }))}
              placeholder="输入昵称"
              maxLength={32}
              className="w-full px-4 py-2.5 text-[14px] rounded-xl
                bg-white dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-[#e5e5e5] dark:border-[#333]
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">密码</label>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm(p => ({ ...p, password: e.target.value }))}
              placeholder="留空则不修改密码"
              maxLength={64}
              className="w-full px-4 py-2.5 text-[14px] rounded-xl
                bg-white dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-[#e5e5e5] dark:border-[#333]
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">账号状态</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm(p => ({ ...p, status: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 text-[14px] rounded-xl
                bg-white dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                border border-[#e5e5e5] dark:border-[#333]
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200 appearance-none
                cursor-pointer"
            >
              <option value={0}>正常</option>
              <option value={1}>禁用</option>
            </select>
          </div>
        </div>
      </ConfirmDialog>

      {/* ====== 删除确认弹窗 ====== */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除用户"
        description={`确定要删除用户「${deleteTarget?.username || ''}」吗？该操作不可恢复。`}
        confirmLabel="删除"
        confirmDanger
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ====== 批量禁用确认弹窗 ====== */}
      <ConfirmDialog
        open={batchAction === 'disable'}
        title="批量禁用"
        description={`确定要禁用选中的 ${selectedIds.size} 个用户吗？禁用后用户将无法登录。`}
        confirmLabel="禁用"
        loading={batchProcessing}
        onConfirm={handleBatchConfirm}
        onCancel={() => setBatchAction(null)}
      />

      {/* ====== 批量删除确认弹窗 ====== */}
      <ConfirmDialog
        open={batchAction === 'delete'}
        title="批量删除"
        description={`确定要删除选中的 ${selectedIds.size} 个用户吗？该操作不可恢复。`}
        confirmLabel="删除"
        confirmDanger
        loading={batchProcessing}
        onConfirm={handleBatchConfirm}
        onCancel={() => setBatchAction(null)}
      />
    </div>
  )
}
