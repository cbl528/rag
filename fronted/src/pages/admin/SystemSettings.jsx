import { useState, useEffect, useCallback } from 'react'
import { Settings, Database, ToggleLeft, ToggleRight, Edit3, Trash2, Plus, Loader2, Check, X } from 'lucide-react'
import { http } from '../../utils/http'
import ConfirmDialog from '../../components/ConfirmDialog'

const GROUP_ORDER = ['rag', 'model', 'milvus', 'upload']

function fmtTime(t) {
  if (!t) return '-'
  try { return new Date(t).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return '-' }
}

export default function SystemSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // DB 配置编辑
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  // 新建 DB 配置
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ configKey: '', configValue: '', configGroup: 'rag', description: '' })

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await http.get('/api/v1/admin/settings')
      setSettings(data)
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // 排序 groups
  const sortedGroups = settings?.groups
    ? [...settings.groups].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
    : []

  // 更新配置值
  const handleUpdateConfig = async (id) => {
    if (!editValue.trim()) return
    setSaving(true)
    try {
      await http.put(`/api/v1/admin/system-configs/${id}`, { configValue: editValue.trim() })
      setEditDialogOpen(false)
      loadSettings()
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 切换启用
  const handleToggle = async (id) => {
    try {
      await http.put(`/api/v1/admin/system-configs/${id}/toggle`)
      loadSettings()
    } catch (e) {
      setError(e.message || '操作失败')
    }
  }

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await http.delete(`/api/v1/admin/system-configs/${deleteTarget.id}`)
      setDeleteTarget(null)
      loadSettings()
    } catch (e) {
      setError(e.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  // 新建
  const handleCreate = async () => {
    if (!createForm.configKey.trim() || !createForm.configValue.trim()) return
    setSaving(true)
    try {
      await http.post('/api/v1/admin/system-configs', {
        configKey: createForm.configKey.trim(),
        configValue: createForm.configValue.trim(),
        configGroup: createForm.configGroup,
        description: createForm.description.trim(),
      })
      setCreateDialogOpen(false)
      setCreateForm({ configKey: '', configValue: '', configGroup: 'rag', description: '' })
      loadSettings()
    } catch (e) {
      setError(e.message || '创建失败')
    } finally {
      setSaving(false)
    }
  }

  // 为某个已知配置创建 DB 覆盖
  const handleOverride = async (key, defaultValue, group, description) => {
    setSaving(true)
    try {
      await http.post('/api/v1/admin/system-configs', {
        configKey: key,
        configValue: defaultValue,
        configGroup: group,
        description: description,
      })
      loadSettings()
    } catch (e) {
      setError(e.message || '创建失败')
    } finally {
      setSaving(false)
    }
  }

  // 打开编辑弹窗
  const openEdit = (item) => {
    setEditTarget(item)
    setEditValue(item.value)
    setEditDialogOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 页面标题 */}
      <div className="px-8 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">系统设置</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
          查看当前系统配置，动态覆盖项可在数据库配置表中修改并即时生效
        </p>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-6 space-y-8">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[13px] text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* ===== 配置总览 ===== */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Settings size={18} className="text-gray-500" />
                <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">配置总览</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sortedGroups.map((group) => (
                  <div
                    key={group.group}
                    className="rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#1c1c1e] overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-[#e5e5e5] dark:border-[#333] bg-[#f5f5f7] dark:bg-[#222]">
                      <span className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {group.groupLabel}
                      </span>
                    </div>
                    <div className="divide-y divide-[#e5e5e5] dark:divide-[#333]">
                      {group.items.map((item) => (
                        <div key={item.key} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                                  {item.description}
                                </span>
                                {item.dbOverride ? (
                                  item.dbEnabled ? (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      动态覆盖
                                    </span>
                                  ) : (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700">
                                      已禁用
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800">
                                    静态
                                  </span>
                                )}
                              </div>
                              <code className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                                {item.key}
                              </code>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <code className="text-[13px] px-2.5 py-1 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] font-mono">
                                {item.value}
                              </code>
                              {item.dbOverride && item.dbConfigId ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openEdit({ id: item.dbConfigId, value: item.value })}
                                    className="p-1 rounded hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-gray-400 hover:text-blue-500 transition-colors"
                                    title="修改值"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleToggle(item.dbConfigId)}
                                    className="p-1 rounded hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-gray-400 hover:text-amber-500 transition-colors"
                                    title={item.dbEnabled ? '禁用覆盖' : '启用覆盖'}
                                  >
                                    {item.dbEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget({ id: item.dbConfigId, key: item.key })}
                                    className="p-1 rounded hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-gray-400 hover:text-red-500 transition-colors"
                                    title="删除覆盖（回退到静态值）"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOverride(item.key, item.defaultValue, group.group, item.description)}
                                  disabled={saving}
                                  className="text-[12px] px-2.5 py-1 rounded-lg border border-dashed border-[#e5e5e5] dark:border-[#444]
                                    text-gray-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-700
                                    transition-colors disabled:opacity-50"
                                  title="创建动态覆盖"
                                >
                                  + 覆盖
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ===== DB 配置管理 ===== */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database size={18} className="text-gray-500" />
                  <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">动态配置管理</h2>
                  <span className="text-[12px] text-gray-400 dark:text-gray-500">
                    ({settings?.dbConfigs?.length || 0} 条)
                  </span>
                </div>
                <button
                  onClick={() => setCreateDialogOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium
                    bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} />
                  新增配置
                </button>
              </div>

              {(!settings?.dbConfigs || settings.dbConfigs.length === 0) ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-[#e5e5e5] dark:border-[#333]">
                  <p className="text-[14px] text-gray-400 dark:text-gray-500">暂无动态配置</p>
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">在上方配置总览中点击「+ 覆盖」或在下方新增</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[#e5e5e5] dark:border-[#333]">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-[#f5f5f7] dark:bg-[#1c1c1e] text-gray-500 dark:text-gray-400">
                        <th className="text-left px-4 py-3 font-medium">配置键</th>
                        <th className="text-left px-4 py-3 font-medium">值</th>
                        <th className="text-left px-4 py-3 font-medium">分组</th>
                        <th className="text-left px-4 py-3 font-medium">说明</th>
                        <th className="w-16 px-4 py-3 text-center font-medium">状态</th>
                        <th className="w-28 px-4 py-3 font-medium">更新时间</th>
                        <th className="w-28 px-4 py-3 text-center font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#333]">
                      {settings.dbConfigs.map((item) => (
                        <tr key={item.id} className="hover:bg-[#f9f9f9] dark:hover:bg-[#1c1c1e]/50 transition-colors">
                          <td className="px-4 py-3">
                            <code className="text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7]">{item.configKey}</code>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-[12px] text-gray-600 dark:text-gray-300">{item.configValue}</code>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.configGroup}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={item.description}>
                            {item.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleToggle(item.id)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                                item.enabled
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              {item.enabled ? '启用' : '禁用'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-400 dark:text-gray-500">
                            {fmtTime(item.updateTime)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit({ id: item.id, value: item.configValue })}
                                className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] transition-colors text-gray-400 hover:text-blue-500"
                                title="编辑"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] transition-colors text-gray-400 hover:text-red-500"
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
            </section>
          </>
        )}
      </div>

      {/* ===== 编辑值弹窗 ===== */}
      <ConfirmDialog
        open={editDialogOpen}
        title="修改配置值"
        confirmLabel="保存"
        loading={saving}
        onConfirm={() => handleUpdateConfig(editTarget?.id)}
        onCancel={() => { setEditDialogOpen(false); setError(null) }}
      >
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="输入新值"
          className="w-full px-4 py-2.5 text-[14px] rounded-xl
            bg-white dark:bg-[#1c1c1e]
            text-[#1d1d1f] dark:text-[#f5f5f7]
            placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
            border border-[#e5e5e5] dark:border-[#333]
            focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
            transition-colors duration-200"
        />
      </ConfirmDialog>

      {/* ===== 新建 DB 配置弹窗 ===== */}
      <ConfirmDialog
        open={createDialogOpen}
        title="新增动态配置"
        confirmLabel="新增"
        loading={saving}
        onConfirm={handleCreate}
        onCancel={() => { setCreateDialogOpen(false); setError(null); setCreateForm({ configKey: '', configValue: '', configGroup: 'rag', description: '' }) }}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">配置键 *</label>
            <input
              type="text"
              value={createForm.configKey}
              onChange={(e) => setCreateForm(p => ({ ...p, configKey: e.target.value }))}
              placeholder="如 rag.rerank.enabled"
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
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">值 *</label>
            <input
              type="text"
              value={createForm.configValue}
              onChange={(e) => setCreateForm(p => ({ ...p, configValue: e.target.value }))}
              placeholder="配置值"
              className="w-full px-4 py-2.5 text-[14px] rounded-xl
                bg-white dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-[#e5e5e5] dark:border-[#333]
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">分组</label>
              <select
                value={createForm.configGroup}
                onChange={(e) => setCreateForm(p => ({ ...p, configGroup: e.target.value }))}
                className="w-full px-4 py-2.5 text-[14px] rounded-xl
                  bg-white dark:bg-[#1c1c1e]
                  text-[#1d1d1f] dark:text-[#f5f5f7]
                  border border-[#e5e5e5] dark:border-[#333]
                  focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                  transition-colors duration-200 appearance-none cursor-pointer"
              >
                <option value="rag">检索配置 (rag)</option>
                <option value="model">模型配置 (model)</option>
                <option value="milvus">向量数据库 (milvus)</option>
                <option value="upload">上传配置 (upload)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-gray-400 dark:text-gray-500 mb-1">说明</label>
            <input
              type="text"
              value={createForm.description}
              onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))}
              placeholder="配置项说明"
              className="w-full px-4 py-2.5 text-[14px] rounded-xl
                bg-white dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-[#e5e5e5] dark:border-[#333]
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* ===== 删除确认 ===== */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除动态配置"
        description={`确定要删除「${deleteTarget?.configKey || deleteTarget?.key || ''}」的覆盖吗？配置将回退到静态默认值。`}
        confirmLabel="删除"
        confirmDanger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
