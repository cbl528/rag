import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit3, Trash2, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { http } from '../../utils/http'
import ConfirmDialog from '../../components/ConfirmDialog'

function fmtTime(t) {
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

export default function SampleQuestions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 编辑弹窗
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // null = 新增模式
  const [form, setForm] = useState({ title: '', question: '', sortOrder: 0, enabled: 1 })
  const [saving, setSaving] = useState(false)

  // 删除弹窗
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await http.get('/api/v1/admin/sample-questions', { query: { page: 1, size: 100 } })
      setItems(data.records || [])
    } catch (e) {
      setError(e.message || '加载失败')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // 打开新增弹窗
  const openCreate = () => {
    setEditTarget(null)
    setForm({ title: '', question: '', sortOrder: items.length + 1, enabled: 1 })
    setDialogOpen(true)
  }

  // 打开编辑弹窗
  const openEdit = (item) => {
    setEditTarget(item)
    setForm({
      title: item.title || '',
      question: item.question || '',
      sortOrder: item.sortOrder ?? 0,
      enabled: item.enabled ?? 1,
    })
    setDialogOpen(true)
  }

  // 保存（新增/修改）
  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('标题不能为空')
      return
    }
    if (!form.question.trim()) {
      setError('问题内容不能为空')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        question: form.question.trim(),
        sortOrder: form.sortOrder,
        enabled: form.enabled,
      }
      if (editTarget) {
        await http.put(`/api/v1/admin/sample-questions/${editTarget.id}`, payload)
      } else {
        await http.post('/api/v1/admin/sample-questions', payload)
      }
      setDialogOpen(false)
      loadItems()
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await http.delete(`/api/v1/admin/sample-questions/${deleteTarget.id}`)
      setDeleteTarget(null)
      loadItems()
    } catch (e) {
      setError(e.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  // 切换启用状态
  const toggleEnabled = async (item) => {
    try {
      await http.put(`/api/v1/admin/sample-questions/${item.id}`, {
        enabled: item.enabled === 1 ? 0 : 1,
      })
      loadItems()
    } catch (e) {
      setError(e.message || '操作失败')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 页面标题 */}
      <div className="px-8 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">建议问题管理</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
          管理欢迎页展示的建议问题，用户点击后自动发送
        </p>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-6">
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[13px] text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* 工具栏 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] text-gray-500 dark:text-gray-400">
            {items.length} 条记录
          </span>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-[14px] font-medium
              bg-blue-600 text-white hover:bg-blue-700
              transition-colors duration-200"
          >
            <Plus size={16} />
            新增问题
          </button>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[14px] text-gray-400 dark:text-gray-500">暂无建议问题</p>
            <button
              onClick={openCreate}
              className="mt-3 text-[13px] text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              新增第一个
            </button>
          </div>
        )}

        {/* 表格 */}
        {!loading && items.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[#e5e5e5] dark:border-[#333]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f5f5f7] dark:bg-[#1c1c1e] text-gray-500 dark:text-gray-400">
                  <th className="w-14 px-3 py-3 text-center font-medium">排序</th>
                  <th className="text-left px-3 py-3 font-medium">标题</th>
                  <th className="text-left px-3 py-3 font-medium">问题内容</th>
                  <th className="w-20 px-3 py-3 text-center font-medium">状态</th>
                  <th className="w-36 px-3 py-3 font-medium">创建时间</th>
                  <th className="w-28 px-3 py-3 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#333]">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#f9f9f9] dark:hover:bg-[#1c1c1e]/50 transition-colors"
                  >
                    <td className="px-3 py-3 text-center text-gray-400 dark:text-gray-500">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[13px]">{item.sortOrder}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[#1d1d1f] dark:text-[#f5f5f7] font-medium">
                      {item.title}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 max-w-[300px] truncate" title={item.question}>
                      {item.question}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => toggleEnabled(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                          item.enabled === 1
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {item.enabled === 1 ? '启用' : '禁用'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-gray-400 dark:text-gray-500 text-[12px]">
                      {fmtTime(item.createTime)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] transition-colors
                            text-gray-400 hover:text-blue-500"
                          title="编辑"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] transition-colors
                            text-gray-400 hover:text-red-500"
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
        )}
      </div>

      {/* ====== 新增/编辑弹窗 ====== */}
      <ConfirmDialog
        open={dialogOpen}
        title={editTarget ? '编辑建议问题' : '新增建议问题'}
        confirmLabel={editTarget ? '保存' : '新增'}
        loading={saving}
        onConfirm={handleSave}
        onCancel={() => { setDialogOpen(false); setError(null) }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="显示在卡片上的文字"
              maxLength={200}
              className="w-full px-4 py-2.5 text-[14px] rounded-xl
                bg-white dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-[#e5e5e5] dark:border-[#333]
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
          </div>
          <div>
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">问题内容 *</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm(p => ({ ...p, question: e.target.value }))}
              placeholder="点击后发送给助手的消息"
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2.5 text-[14px] rounded-xl resize-none
                bg-white dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-[#e5e5e5] dark:border-[#333]
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">排序</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                min={0}
                className="w-full px-4 py-2.5 text-[14px] rounded-xl
                  bg-white dark:bg-[#1c1c1e]
                  text-[#1d1d1f] dark:text-[#f5f5f7]
                  border border-[#e5e5e5] dark:border-[#333]
                  focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                  transition-colors duration-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">状态</label>
              <select
                value={form.enabled}
                onChange={(e) => setForm(p => ({ ...p, enabled: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 text-[14px] rounded-xl
                  bg-white dark:bg-[#1c1c1e]
                  text-[#1d1d1f] dark:text-[#f5f5f7]
                  border border-[#e5e5e5] dark:border-[#333]
                  focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                  transition-colors duration-200 appearance-none cursor-pointer"
              >
                <option value={1}>启用</option>
                <option value={0}>禁用</option>
              </select>
            </div>
          </div>
        </div>
      </ConfirmDialog>

      {/* ====== 删除确认弹窗 ====== */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除建议问题"
        description={`确定要删除「${deleteTarget?.title || ''}」吗？`}
        confirmLabel="删除"
        confirmDanger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
