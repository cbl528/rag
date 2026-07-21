import { useState, useEffect, useCallback } from 'react'
import {
  Settings, MessageSquare, Layers, ArrowUpDown,
  X, Loader2,
} from 'lucide-react'
import { http } from '../../utils/http'
import ConfirmDialog from '../../components/ConfirmDialog'

/* ====================== 常量 ====================== */

const RAG_BOOL_KEYS = ['rag.rerank.enabled', 'rag.trace.enabled']

const RAG_LABELS = {
  'rag.rerank.enabled':    '重排序开关',
  'rag.candidate-top-k':   '检索候选数',
  'rag.final-top-k':       '最终保留数',
  'rag.sse-timeout-ms':    'SSE 超时时间',
  'rag.trace.enabled':     '链路追踪',
}

const MODEL_DEFS = [
  { type: 'chat-model',        label: '对话模型',     icon: MessageSquare, desc: '用于对话生成的 LLM 模型',       accent: 'blue' },
  { type: 'embedding-model',   label: '向量模型',     icon: Layers,        desc: '用于文档向量化的 Embedding 模型', accent: 'emerald' },
  { type: 'rerank-model',      label: '重排序模型',   icon: ArrowUpDown,   desc: '对检索结果重排序，提升相关性',     accent: 'amber' },
]

const ACCENT_STYLES = {
  blue:    { icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' },
  emerald: { icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300' },
  amber:   { icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300' },
}

/* ====================== 主组件 ====================== */

export default function SystemSettings() {
  const [systemConfigs, setSystemConfigs] = useState([])
  const [modelConfigs, setModelConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 编辑弹窗（配置总览数值编辑）
  const [editItem, setEditItem] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // 模型配置表单弹窗
  const [modelForm, setModelForm] = useState({ open: false, saving: false, modelType: null, editId: null, fields: {} })

  // ===== 数据加载 =====
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sysRes, models] = await Promise.all([
        http.get('/api/v1/admin/system-configs'),
        http.get('/api/v1/admin/model-configs'),
      ])
      setSystemConfigs(sysRes || [])
      setModelConfigs(models || [])
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ===== 辅助函数 =====

  const ragConfigs = systemConfigs.filter(c => c.configGroup === 'rag')

  const getModelsByType = (type) => modelConfigs.filter(m => m.type === type)

  // ===== 配置总览：布尔开关 =====
  const handleRagBoolToggle = async (item) => {
    const newValue = item.configValue === 'true' ? 'false' : 'true'
    try {
      await http.put(
        `/api/v1/admin/system-configs/by-key?configKey=${encodeURIComponent(item.configKey)}`,
        { configValue: newValue },
      )
      await load()
    } catch (e) {
      setError(e.message || '操作失败')
    }
  }

  // ===== 配置总览：编辑值 =====
  const openEdit = (item) => {
    setEditItem(item)
    setEditValue(item.configValue)
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!editValue.trim() || !editItem) return
    setSaving(true)
    try {
      await http.put(
        `/api/v1/admin/system-configs/by-key?configKey=${encodeURIComponent(editItem.configKey)}`,
        { configValue: editValue.trim() },
      )
      setEditOpen(false)
      await load()
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // ===== 模型配置：打开表单弹窗 =====
  const openModelForm = (modelType, editId = null) => {
    const config = editId ? modelConfigs.find(m => m.id === editId) : null
    setModelForm({
      open: true,
      saving: false,
      modelType,
      editId,
      fields: config ? {
        baseUrl: config.baseUrl || '',
        apiKey: config.apiKey || '',
        modelName: config.modelName || '',
        enabled: config.enabled ?? 1,
      } : {
        baseUrl: '',
        apiKey: '',
        modelName: '',
        enabled: 1,
      },
    })
  }

  const updateModelField = (key, value) => {
    setModelForm(prev => ({ ...prev, fields: { ...prev.fields, [key]: value } }))
  }

  // ===== 模型配置：保存 =====
  const handleModelFormSave = async () => {
    const { fields, modelType, editId } = modelForm
    const payload = {
      type: modelType,
      modelName: fields.modelName?.trim() || '',
      baseUrl: fields.baseUrl?.trim() || '',
      apiKey: fields.apiKey?.trim() || '',
      enabled: fields.enabled,
    }
    setModelForm(prev => ({ ...prev, saving: true }))
    try {
      if (editId) {
        await http.put(`/api/v1/admin/model-configs/${editId}`, payload)
      } else {
        await http.post('/api/v1/admin/model-configs', payload)
      }
      setModelForm(prev => ({ ...prev, open: false }))
      await load()
    } catch (e) {
      setError(e.message || '保存失败')
      setModelForm(prev => ({ ...prev, saving: false }))
    }
  }

  // ===== 模型配置：启用/禁用 =====
  const handleModelToggle = async (modelId) => {
    if (!modelId) return
    try {
      await http.put(`/api/v1/admin/model-configs/${modelId}/toggle-enabled`)
      await load()
    } catch (e) {
      setError(e.message || '操作失败')
    }
  }

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
          系统参数和 AI 模型管理
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
        {/*  一、检索配置                                                      */}
        {/* ================================================================ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-gray-500" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">检索配置</h2>
          </div>

          <div className="rounded-xl border border-[#e5e5e5] dark:border-[#333] bg-white dark:bg-[#1c1c1e] overflow-hidden">
            <div className="divide-y divide-[#e5e5e5] dark:divide-[#333]">
              {ragConfigs.map((item) => {
                const isBool = RAG_BOOL_KEYS.includes(item.configKey)
                const enabled = item.configValue === 'true'

                return (
                  <div key={item.id || item.configKey} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {RAG_LABELS[item.configKey] || item.configKey}
                          </span>
                          {isBool && (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-full border ${
                              enabled
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                            }`}>
                              {enabled ? '已开启' : '已关闭'}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isBool ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            onClick={() => handleRagBoolToggle(item)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
                                        transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2
                                        focus-visible:ring-offset-2 focus-visible:ring-[#1d1d1f] dark:focus-visible:ring-[#f5f5f7]
                                        ${enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-[#444]'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
                                            ${enabled ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                          </button>
                        ) : (
                          <>
                            <code className="text-[13px] px-2.5 py-1 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] font-mono">
                              {item.configValue}
                            </code>
                            <button
                              onClick={() => openEdit(item)}
                              className="text-[12px] px-2.5 py-1 rounded-lg border border-[#e5e5e5] dark:border-[#444]
                                text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-700
                                transition-colors"
                            >
                              编辑
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/*  二、模型配置                                                      */}
        {/* ================================================================ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-gray-500" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">模型配置</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODEL_DEFS.map((def) => {
              const accent = ACCENT_STYLES[def.accent]
              const Icon = def.icon
              const models = getModelsByType(def.type)
              const enabledCount = models.filter(m => m.enabled === 1).length

              return (
                <div
                  key={def.type}
                  className="rounded-2xl border border-[#e5e5e5] dark:border-[#333]
                             bg-white dark:bg-[#1c1c1e] overflow-hidden
                             transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
                >
                  {/* ---- 头部：图标 + 标题 + 新增按钮 ---- */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
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
                      <button
                        onClick={() => openModelForm(def.type)}
                        className="shrink-0 text-[12px] px-3 py-1.5 rounded-lg font-medium
                                   text-emerald-600 dark:text-emerald-400
                                   bg-emerald-50 dark:bg-emerald-900/20
                                   hover:bg-emerald-100 dark:hover:bg-emerald-900/40
                                   active:scale-[0.97] transition-all duration-150"
                      >
                        + 新增
                      </button>
                    </div>
                  </div>

                  {/* ---- 模型列表 ---- */}
                  {models.length === 0 ? (
                    <div className="mx-5 mb-5 px-4 py-6 rounded-xl bg-[#f5f5f7] dark:bg-[#222]
                                    border border-dashed border-[#e5e5e5] dark:border-[#2a2a2a]">
                      <p className="text-center text-[13px] text-gray-400 dark:text-gray-500">
                        暂无模型配置，点击"+ 新增"添加
                      </p>
                    </div>
                  ) : (
                    <div className="mx-5 mb-5 space-y-2">
                      {models.map((model) => {
                        const isEnabled = model.enabled === 1
                        return (
                          <div key={model.id}
                               className={`flex items-center justify-between px-4 py-3 rounded-xl
                                           border transition-colors duration-150
                                           ${isEnabled
                                             ? 'bg-[#f5f5f7] dark:bg-[#222] border-[#e5e5e5] dark:border-[#2a2a2a]'
                                             : 'bg-white dark:bg-[#1c1c1e] border-transparent'}`}
                          >
                            <div className="min-w-0 flex-1 mr-3">
                              <span className="text-[14px] font-mono font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate block">
                                {model.modelName}
                              </span>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                {model.baseUrl || '未配置 API 地址'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isEnabled ? (
                                <span className="text-[12px] px-2.5 py-1.5 rounded-lg font-medium
                                                 text-gray-400 dark:text-gray-500
                                                 bg-gray-100 dark:bg-[#2c2c2e]
                                                 cursor-not-allowed select-none">
                                  启用中
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleModelToggle(model.id)}
                                  className="text-[12px] px-2.5 py-1.5 rounded-lg font-medium
                                             text-blue-600 dark:text-blue-400
                                             bg-blue-50 dark:bg-blue-900/20
                                             hover:bg-blue-100 dark:hover:bg-blue-900/40
                                             active:scale-[0.97] transition-all duration-150"
                                >
                                  启用
                                </button>
                              )}
                              <button
                                onClick={() => openModelForm(def.type, model.id)}
                                className="text-[12px] px-2 py-1.5 rounded-lg font-medium
                                           text-blue-600 dark:text-blue-400
                                           bg-blue-50 dark:bg-blue-900/20
                                           hover:bg-blue-100 dark:hover:bg-blue-900/40
                                           active:scale-[0.97] transition-all duration-150"
                              >
                                编辑
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/*  弹窗：修改系统配置值                                               */}
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

      {/* ================================================================ */}
      {/*  弹窗：模型配置表单                                                */}
      {/* ================================================================ */}
      <ConfirmDialog
        open={modelForm.open}
        title={(() => {
          const def = MODEL_DEFS.find(m => m.type === modelForm.modelType)
          return def ? `${modelForm.editId ? '编辑' : '新增'}${def.label}` : '模型配置'
        })()}
        confirmLabel="保存"
        loading={modelForm.saving}
        onConfirm={handleModelFormSave}
        onCancel={() => setModelForm(prev => ({ ...prev, open: false }))}
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              API 地址
            </label>
            <input
              type="text"
              value={modelForm.fields.baseUrl || ''}
              onChange={(e) => updateModelField('baseUrl', e.target.value)}
              placeholder="https://api.siliconflow.cn/v1"
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
            <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              API 密钥
            </label>
            <input
              type="password"
              value={modelForm.fields.apiKey || ''}
              onChange={(e) => updateModelField('apiKey', e.target.value)}
              placeholder="请输入 API 密钥"
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
            <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              模型名
            </label>
            <input
              type="text"
              value={modelForm.fields.modelName || ''}
              onChange={(e) => updateModelField('modelName', e.target.value)}
              placeholder="Qwen/Qwen3-8B"
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
    </div>
  )
}
