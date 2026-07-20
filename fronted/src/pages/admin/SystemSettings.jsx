import { useState, useEffect, useCallback } from 'react'
import {
  Settings, MessageSquare, Layers, ArrowUpDown,
  X, Loader2, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { http } from '../../utils/http'
import ConfirmDialog from '../../components/ConfirmDialog'

/* ====================== 工具函数 ====================== */

function findItem(settings, key) {
  if (!settings?.groups) return null
  for (const g of settings.groups) {
    for (const item of g.items) {
      if (item.key === key) return item
    }
  }
  return null
}

/* ====================== 常量 ====================== */

const GROUP_ORDER = ['rag', 'model', 'milvus', 'upload']

const GROUP_LABELS = {
  rag: '检索配置',
  model: '模型配置',
  milvus: '向量数据库',
  upload: '上传配置',
}

const MODEL_DEFS = [
  {
    key: 'openai.model',
    label: '对话模型',
    icon: MessageSquare,
    desc: '用于对话生成的 LLM 模型',
    accent: 'blue',
  },
  {
    key: 'openai.embedding-model',
    label: '向量模型',
    icon: Layers,
    desc: '用于文档向量化的 Embedding 模型',
    accent: 'emerald',
  },
  {
    key: 'rag.rerank.enabled',
    label: '重排序模型',
    icon: ArrowUpDown,
    desc: '对检索结果重排序，提升相关性',
    accent: 'amber',
    modelKey: 'rag.rerank.model',
  },
]

const ACCENT_STYLES = {
  blue: { icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300', toggle: 'bg-blue-600' },
  emerald: { icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300', toggle: 'bg-emerald-600' },
  amber: { icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300', toggle: 'bg-amber-600' },
}

/* ====================== 主组件 ====================== */

export default function SystemSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 编辑弹窗（配置总览 + 模型卡片共用）
  const [editItem, setEditItem] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // ===== 数据加载 =====
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSettings(await http.get('/api/v1/admin/settings'))
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ===== 检查模型是否启用（DB 覆盖） =====
  const isModelEnabled = (def) => {
    const item = findItem(settings, def.key)
    if (!item) return false
    if (!item.dbOverride) return false
    return item.dbEnabled
  }

  // ===== 模型卡片：切换启用/禁用 =====
  const handleToggle = async (def) => {
    const item = findItem(settings, def.key)
    if (!item) return
    try {
      if (item.dbConfigId) {
        await http.put(`/api/v1/admin/system-configs/${item.dbConfigId}/toggle`)
      } else {
        await http.post('/api/v1/admin/system-configs', {
          configKey: item.key,
          configValue: item.defaultValue,
          configGroup: def.key.startsWith('rag') ? 'rag' : 'model',
          description: item.description || '',
        })
      }
      await load()
    } catch (e) {
      setError(e.message || '操作失败')
    }
  }

  // ===== 模型卡片：打开修改弹窗 =====
  const openModelEdit = (def) => {
    const targetKey = def.modelKey || def.key
    const item = findItem(settings, targetKey)
    if (!item) return
    setEditItem({ key: targetKey, value: item.value, dbConfigId: item.dbConfigId, description: item.description })
    setEditValue(item.value)
    setEditOpen(true)
  }

  // ===== 通用：保存编辑值 =====
  const handleEditSave = async () => {
    if (!editValue.trim() || !editItem) return
    setSaving(true)
    try {
      if (editItem.dbConfigId) {
        await http.put(`/api/v1/admin/system-configs/${editItem.dbConfigId}`, {
          configValue: editValue.trim(),
        })
      } else {
        const item = findItem(settings, editItem.key)
        await http.post('/api/v1/admin/system-configs', {
          configKey: editItem.key,
          configValue: editValue.trim(),
          configGroup: editItem.key.startsWith('rag') ? 'rag' : 'model',
          description: item?.description || '',
        })
      }
      setEditOpen(false)
      await load()
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // ===== 配置总览：编辑值 =====
  const openEdit = (item) => {
    setEditItem(item)
    setEditValue(item.value)
    setEditOpen(true)
  }

  // ===== 配置总览：创建覆盖 =====
  const handleOverride = async (item) => {
    try {
      await http.post('/api/v1/admin/system-configs', {
        configKey: item.key,
        configValue: item.defaultValue,
        configGroup: item.key.startsWith('rag') || item.key.startsWith('milvus') ? item.key.split('.')[0] : 'model',
        description: item.description || '',
      })
      await load()
    } catch (e) {
      setError(e.message || '创建失败')
    }
  }

  // ===== 配置总览：切换覆盖启用 =====
  const handleToggleConfig = async (id) => {
    try {
      await http.put(`/api/v1/admin/system-configs/${id}/toggle`)
      await load()
    } catch (e) {
      setError(e.message || '操作失败')
    }
  }

  // ===== 排序 groups =====
  const sortedGroups = settings?.groups
    ? [...settings.groups].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
    : []

  /* ====================== Render ====================== */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ===== 页面标题 ===== */}
      <div className="px-8 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">系统设置</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
          查看当前系统配置，管理 AI 模型
        </p>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-10">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                          text-[13px] text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/*  一、配置总览                                                      */}
        {/* ================================================================ */}
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
                    {GROUP_LABELS[group.group] || group.group}
                  </span>
                </div>
                <div className="divide-y divide-[#e5e5e5] dark:divide-[#333]">
                  {group.items.map((item) => (
                    <div key={item.key} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
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
                          {item.explanation && (
                            <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed mt-1">
                              {item.explanation}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <code className="text-[13px] px-2.5 py-1 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] font-mono">
                            {item.value}
                          </code>
                          {item.dbOverride && item.dbConfigId ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEdit({ key: item.key, value: item.value })}
                                className="p-1 rounded hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-gray-400 hover:text-blue-500 transition-colors"
                                title="修改值"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleToggleConfig(item.dbConfigId)}
                                className="p-1 rounded hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-gray-400 hover:text-amber-500 transition-colors"
                                title={item.dbEnabled ? '禁用覆盖' : '启用覆盖'}
                              >
                                {item.dbEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOverride(item)}
                              className="text-[12px] px-2.5 py-1 rounded-lg border border-dashed border-[#e5e5e5] dark:border-[#444]
                                text-gray-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-700
                                transition-colors"
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

        {/* ================================================================ */}
        {/*  二、模型配置（三张卡片）                                          */}
        {/* ================================================================ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-gray-500" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">模型配置</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODEL_DEFS.map((def) => {
              const enabled = isModelEnabled(def)
              const accent = ACCENT_STYLES[def.accent]
              const Icon = def.icon

              // 获取显示值
              const valueKey = def.modelKey || def.key
              const valueItem = findItem(settings, valueKey)
              let displayValue = valueItem?.value || '-'
              if (def.modelKey) {
                const enableItem = findItem(settings, def.key)
                displayValue = enableItem?.value === 'true'
                  ? `已启用 · ${displayValue}`
                  : '未启用'
              }

              return (
                <div
                  key={def.key}
                  className="rounded-2xl border border-[#e5e5e5] dark:border-[#333]
                             bg-white dark:bg-[#1c1c1e] overflow-hidden
                             transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
                >
                  {/* ---- 头部：图标 + 标题 ---- */}
                  <div className="p-5 pb-0">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent.icon}`}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight">
                          {def.label}
                        </h3>
                        <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {def.desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ---- 值展示区 ---- */}
                  <div className="mx-5 mt-4 mb-4 px-4 py-3 rounded-xl
                                  bg-[#f5f5f7] dark:bg-[#222]
                                  border border-[#e5e5e5] dark:border-[#2a2a2a]">
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">
                      {def.modelKey ? '状态' : '当前模型'}
                    </div>
                    <div className="text-[14px] font-mono font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                      {displayValue}
                    </div>
                  </div>

                  {/* ---- 操作区：切换 + 修改 ---- */}
                  <div className="px-5 pb-5 flex items-center justify-between">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => handleToggle(def)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
                                  transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2
                                  focus-visible:ring-offset-2 focus-visible:ring-[#1d1d1f] dark:focus-visible:ring-[#f5f5f7]
                                  ${enabled ? accent.toggle : 'bg-gray-200 dark:bg-[#444]'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
                                    ${enabled ? 'translate-x-[22px]' : 'translate-x-[3px]'}`}
                      />
                    </button>

                    <button
                      onClick={() => openModelEdit(def)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium rounded-lg
                                 text-gray-600 dark:text-gray-300
                                 bg-gray-100 dark:bg-[#2c2c2e]
                                 hover:bg-gray-200 dark:hover:bg-[#333]
                                 active:scale-[0.97] transition-all duration-150"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      </svg>
                      修改
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/*  弹窗：修改配置值                                                 */}
      {/* ================================================================ */}
      <ConfirmDialog
        open={editOpen}
        title="修改配置值"
        confirmLabel="保存"
        loading={saving}
        onConfirm={handleEditSave}
        onCancel={() => { setEditOpen(false); setError(null) }}
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
    </div>
  )
}

