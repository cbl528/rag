import { useState, useEffect, useCallback } from 'react'
import {
  Settings, MessageSquare, Layers, ArrowUpDown,
  Plus, X, Loader2, ToggleLeft, ToggleRight,
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

function findDbItem(settings, key) {
  return settings?.dbConfigs?.find(d => d.configKey === key) || null
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str) }
  catch { return fallback }
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
    presetKey: '_preset.openai.model',
    defaultPresets: ['Qwen/Qwen3-8B', 'deepseek-chat', 'gpt-4o'],
  },
  {
    key: 'openai.embedding-model',
    label: '向量模型',
    icon: Layers,
    desc: '用于文档向量化的 Embedding 模型',
    accent: 'emerald',
    presetKey: '_preset.openai.embedding-model',
    defaultPresets: ['BAAI/bge-large-zh-v1.5', 'text-embedding-3-small'],
  },
  {
    key: 'rag.rerank.enabled',
    label: '重排序模型',
    icon: ArrowUpDown,
    desc: '对检索结果重排序，提升相关性',
    accent: 'amber',
    presetKey: '_preset.rag.rerank.model',
    defaultPresets: ['Qwen/Qwen3-Reranker-0.6B', 'BAAI/bge-reranker-v2-m3'],
    /** 实际存储模型名的配置键（不同于启用开关） */
    modelKey: 'rag.rerank.model',
  },
]

const ACCENT_STYLES = {
  blue: {
    icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300',
    chip: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200',
    chipActive: 'bg-blue-600 text-white border-blue-600',
    toggle: 'bg-blue-600',
  },
  emerald: {
    icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300',
    chip: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-200',
    chipActive: 'bg-emerald-600 text-white border-emerald-600',
    toggle: 'bg-emerald-600',
  },
  amber: {
    icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300',
    chip: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-200',
    chipActive: 'bg-amber-600 text-white border-amber-600',
    toggle: 'bg-amber-600',
  },
}

/* ====================== 主组件 ====================== */

export default function SystemSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 添加预设弹窗
  const [addTarget, setAddTarget] = useState(null) // modelDef
  const [addValue, setAddValue] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // 编辑配置弹窗（配置总览用）
  const [editItem, setEditItem] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  // ===== 数据加载 =====
  const load = useCallback(async () => {
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

  useEffect(() => { load() }, [load])

  // ===== 获取预设列表（DB 兜底默认值） =====
  const getPresets = useCallback((def) => {
    const dbItem = findDbItem(settings, def.presetKey)
    if (dbItem && dbItem.configValue) {
      const parsed = safeJsonParse(dbItem.configValue, null)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    return def.defaultPresets
  }, [settings])

  // ===== 保存预设列表到 DB =====
  const savePresets = async (def, presets) => {
    const dbItem = findDbItem(settings, def.presetKey)
    const body = {
      configKey: def.presetKey,
      configValue: JSON.stringify(presets),
      configGroup: 'model',
      description: `${def.label}预设列表`,
    }
    if (dbItem) {
      await http.put(`/api/v1/admin/system-configs/${dbItem.id}`, { configValue: body.configValue })
    } else {
      await http.post('/api/v1/admin/system-configs', body)
    }
  }

  // ===== 设置活跃模型 =====
  const setActiveModel = async (def, modelName) => {
    const targetKey = def.modelKey || def.key
    const dbItem = findDbItem(settings, targetKey)
    if (dbItem) {
      await http.put(`/api/v1/admin/system-configs/${dbItem.id}`, { configValue: modelName })
    } else {
      const item = findItem(settings, targetKey)
      await http.post('/api/v1/admin/system-configs', {
        configKey: targetKey,
        configValue: modelName,
        configGroup: targetKey.startsWith('rag') ? 'rag' : 'model',
        description: item?.description || '',
      })
    }
    await load()
  }

  // ===== 获取当前活跃模型名 =====
  const getActiveModel = (def) => {
    if (def.modelKey) {
      const item = findItem(settings, def.modelKey)
      return item?.value || ''
    }
    const item = findItem(settings, def.key)
    // 如果启用开关的值为 true，说明活跃值为 modelKey 的值
    return item?.value || ''
  }

  // ===== 检查模型是否启用（DB 覆盖） =====
  const isModelEnabled = (def) => {
    const item = findItem(settings, def.key)
    if (!item) return false
    if (!item.dbOverride) return false
    return item.dbEnabled
  }

  // ===== 切换启用/禁用 =====
  const handleToggle = async (def) => {
    const item = findItem(settings, def.key)
    if (!item) return
    try {
      if (item.dbConfigId) {
        await http.put(`/api/v1/admin/system-configs/${item.dbConfigId}/toggle`)
      } else {
        await http.post('/api/v1/admin/system-configs', {
          configKey: item.key,
          configValue: def.defaultPresets?.[0] || item.defaultValue,
          configGroup: def.key.startsWith('rag') ? 'rag' : 'model',
          description: item.description || '',
        })
      }
      await load()
    } catch (e) {
      setError(e.message || '操作失败')
    }
  }

  // ===== 点击预设芯片 =====
  const handleSelectPreset = async (def, modelName) => {
    try {
      await setActiveModel(def, modelName)
    } catch (e) {
      setError(e.message || '切换失败')
    }
  }

  // ===== 删除预设 =====
  const handleRemovePreset = async (def, modelName) => {
    const presets = getPresets(def)
    if (presets.length <= 1) return // 至少保留一个
    const newPresets = presets.filter(p => p !== modelName)
    try {
      await savePresets(def, newPresets)
      // 如果删除的是当前活跃的，切换到第一个
      const active = getActiveModel(def)
      if (active === modelName && newPresets.length > 0) {
        await setActiveModel(def, newPresets[0])
      } else {
        await load()
      }
    } catch (e) {
      setError(e.message || '删除失败')
    }
  }

  // ===== 打开添加弹窗 =====
  const openAdd = (def) => {
    setAddTarget(def)
    setAddValue('')
    setAddOpen(true)
  }

  // ===== 确认添加 =====
  const handleAddConfirm = async () => {
    if (!addValue.trim() || !addTarget) return
    const def = addTarget
    const name = addValue.trim()
    const presets = getPresets(def)
    if (presets.includes(name)) {
      setError(`「${name}」已存在`)
      return
    }
    setSaving(true)
    try {
      const newPresets = [...presets, name]
      await savePresets(def, newPresets)
      setAddOpen(false)
      await load()
    } catch (e) {
      setError(e.message || '添加失败')
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
          查看当前系统配置，管理 AI 模型预设
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
        {/*  二、模型配置（预设列表）                                           */}
        {/* ================================================================ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-gray-500" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">模型配置</h2>
            <span className="text-[12px] text-gray-400 dark:text-gray-500">
              点击预设快速切换，可自行添加常用模型
            </span>
          </div>

          <div className="space-y-4">
            {MODEL_DEFS.map((def) => {
              const presets = getPresets(def)
              const activeModel = getActiveModel(def)
              const enabled = isModelEnabled(def)
              const accent = ACCENT_STYLES[def.accent]
              const Icon = def.icon

              // 重排序的显示值
              let displayValue = activeModel
              if (def.modelKey) {
                const enableItem = findItem(settings, def.key)
                displayValue = enableItem?.value === 'true'
                  ? `已启用 · ${activeModel || '未配置'}`
                  : '未启用'
              }

              return (
                <div
                  key={def.key}
                  className="rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#1c1c1e] overflow-hidden"
                >
                  {/* ---- 头部行：图标 + 标签 + 切换开关 + 添加按钮 ---- */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5e5e5] dark:border-[#222]">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent.icon}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <span className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {def.label}
                        </span>
                        <span className="text-[12px] text-gray-400 dark:text-gray-500 ml-2">{def.desc}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* 切换开关 */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => handleToggle(def)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full
                                    transition-colors duration-200
                                    ${enabled ? accent.toggle : 'bg-gray-200 dark:bg-[#444]'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200
                                        ${enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
                      </button>
                      {/* 添加按钮 */}
                      <button
                        onClick={() => openAdd(def)}
                        className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg
                                   text-blue-600 dark:text-blue-400
                                   bg-blue-50 dark:bg-blue-900/20
                                   hover:bg-blue-100 dark:hover:bg-blue-900/30
                                   transition-colors"
                      >
                        <Plus size={13} />
                        添加模型
                      </button>
                    </div>
                  </div>

                  {/* ---- 预设芯片列表 ---- */}
                  <div className="px-5 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {presets.map((name) => {
                        const isActive = name === activeModel
                        return (
                          <span
                            key={name}
                            onClick={() => handleSelectPreset(def, name)}
                            className={`
                              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] cursor-pointer
                              border transition-all duration-150
                              ${isActive
                                ? accent.chipActive + ' shadow-sm'
                                : accent.chip + ' hover:opacity-80'
                              }
                            `}
                          >
                            {isActive && <Check size={12} className="shrink-0" />}
                            {name}
                            {presets.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemovePreset(def, name) }}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10
                                           opacity-60 hover:opacity-100 transition-opacity"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </span>
                        )
                      })}
                    </div>
                    {/* 当前活跃值提示 */}
                    {def.modelKey ? (
                      <div className="mt-2 text-[12px] text-gray-400 dark:text-gray-500">
                        状态：{displayValue}
                      </div>
                    ) : (
                      <div className="mt-2 text-[12px] text-gray-400 dark:text-gray-500">
                        当前：{displayValue}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 text-[12px] text-gray-400 dark:text-gray-500 text-center">
            切换开关启用后，配置值将优先使用数据库中的值；点击预设名称即可切换当前使用的模型
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/*  弹窗：添加模型预设                                                  */}
      {/* ================================================================ */}
      <ConfirmDialog
        open={addOpen}
        title={`添加${addTarget ? addTarget.label : ''}预设`}
        confirmLabel="添加"
        loading={saving}
        onConfirm={handleAddConfirm}
        onCancel={() => { setAddOpen(false); setError(null) }}
      >
        <input
          type="text"
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          placeholder="输入模型名称，如 gpt-4o"
          onKeyDown={(e) => e.key === 'Enter' && !saving && handleAddConfirm()}
          className="w-full px-4 py-2.5 text-[14px] rounded-xl
                     bg-white dark:bg-[#1c1c1e]
                     text-[#1d1d1f] dark:text-[#f5f5f7]
                     placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                     border border-[#e5e5e5] dark:border-[#333]
                     focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                     transition-colors duration-200"
        />
      </ConfirmDialog>

      {/* ================================================================ */}
      {/*  弹窗：修改配置值（配置总览用）                                       */}
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

/* ====================== 内联图标组件 ====================== */

function Check({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
