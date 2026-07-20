import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Activity, Clock, Zap, CheckCircle2, XCircle, Loader2,
  AlertTriangle, X, Hash, Calendar, User, RefreshCw, Copy
} from 'lucide-react'
import { http } from '../../utils/http'

// ============ 工具函数 ============

function formatDuration(ms) {
  if (ms == null || isNaN(ms) || ms <= 0) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  const m = Math.floor(ms / 60000)
  const s = ((ms % 60000) / 1000).toFixed(1)
  return `${m}m ${s}s`
}

function formatTime(t) {
  if (!t) return '-'
  try {
    return new Date(t).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return '-'
  }
}

function toTimestamp(value) {
  if (value == null || value === '') return null
  const d = new Date(value).getTime()
  return isNaN(d) ? null : d
}

function normalizeStatus(status) {
  return (status || '').trim().toLowerCase()
}

function statusBadgeClass(status) {
  const s = normalizeStatus(status)
  if (s === 'success') return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 border-green-200 dark:border-green-800'
  if (s === 'error' || s === 'failed') return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800'
  if (s === 'running') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  return 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
}

function statusLabel(status) {
  const s = normalizeStatus(status)
  if (s === 'success') return 'SUCCESS'
  if (s === 'error' || s === 'failed') return 'FAILED'
  if (s === 'running') return 'RUNNING'
  return (s || 'UNKNOWN').toUpperCase()
}

function nodeTypeChipClass(type) {
  const t = (type || '').trim().toUpperCase()
  const map = {
    ROOT: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    INTENT: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    REWRITE: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    RETRIEVE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    RERANK: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    LLM: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    TITLE_GEN: 'bg-stone-100 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300',
  }
  return map[t] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
}

function prettifyNodeName(name) {
  if (!name) return '-'
  const map = {
    'rag-stream-chat': 'RAG 流式对话',
    'rag-search': '知识库检索',
    'rerank': '重排序',
    'intent': '意图识别',
    'rewrite': '查询改写',
  }
  return map[name.trim()] || name.trim()
}

function resolveNodeDuration(node) {
  const d = Number(node.durationMs ?? 0)
  if (d > 0) return d
  const start = toTimestamp(node.startTime)
  const end = toTimestamp(node.endTime)
  if (start && end && end >= start) return end - start
  return 0
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

// ============ 子组件 ============

function MetricItem({ icon: Icon, label, value, variant = 'default' }) {
  const styles = {
    default: 'text-slate-600 dark:text-slate-400',
    primary: 'text-blue-600 dark:text-blue-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="flex items-center gap-2 px-5 py-3">
      <Icon size={15} className={styles[variant]} />
      <span className={`text-base font-semibold ${styles[variant]}`}>{value}</span>
      <span className="text-[11px] text-gray-400 dark:text-gray-500">{label}</span>
    </div>
  )
}

function WaterfallBar({ depth, nodeName, nodeType, duration, offsetMs, totalMs, status, isSelected, isRoot, onClick }) {
  const statusColors = {
    success: { dot: 'bg-emerald-500', bar: 'bg-emerald-400' },
    failed: { dot: 'bg-red-500', bar: 'bg-red-400' },
    running: { dot: 'bg-amber-500', bar: 'bg-amber-400' },
  }
  const s = normalizeStatus(status)
  const colors = statusColors[s] || { dot: 'bg-slate-300', bar: 'bg-slate-300' }
  const depthLevel = isRoot ? 0 : Math.max(0, depth - 1)
  const leftPct = clamp((offsetMs / totalMs) * 100, 0, 99.2)
  const widthPct = clamp((Math.max(duration, 1) / totalMs) * 100, 0.5, 100 - leftPct)

  return (
    <div
      onClick={onClick}
      className={`grid grid-cols-[1fr_100px_2fr_90px] gap-3 px-4 py-2.5 transition-colors cursor-pointer hover:bg-[#f9f9f9] dark:hover:bg-[#1c1c1e]/50 group ${
        isRoot ? 'bg-indigo-50/40 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/30' : ''
      } ${isSelected ? 'bg-blue-50/60 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-200 dark:ring-blue-700' : ''}`}
    >
      {/* 节点名 */}
      <div className="flex items-center gap-1.5 min-w-0">
        {depthLevel > 0 && (
          <div className="flex items-stretch self-stretch shrink-0">
            {Array.from({ length: depthLevel }).map((_, idx) => (
              <span
                key={idx}
                className={`w-4 border-l border-[#e5e5e5] dark:border-[#333] ${idx === depthLevel - 1 ? 'border-b' : ''}`}
                style={{ marginTop: idx === depthLevel - 1 ? -10 : 0 }}
              />
            ))}
          </div>
        )}
        <span className={`h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
        <span
          className={`truncate text-[13px] ${isRoot ? 'font-semibold text-indigo-800 dark:text-indigo-300' : 'text-[#1d1d1f] dark:text-[#f5f5f7]'}`}
          title={nodeName}
        >
          {nodeName}
        </span>
      </div>

      {/* 类型 */}
      <div className="flex items-center">
        <span className={`text-[11px] px-2 py-0.5 rounded font-medium truncate ${nodeTypeChipClass(nodeType)}`}>
          {nodeType || '-'}
        </span>
      </div>

      {/* 时间条 */}
      <div className="flex items-center">
        <div className="relative w-full h-5 bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded overflow-hidden">
          {[25, 50, 75].map(p => (
            <div key={p} className="absolute top-0 bottom-0 w-px bg-[#e5e5e5] dark:bg-[#333]" style={{ left: `${p}%` }} />
          ))}
          <div
            className={`absolute top-0.5 bottom-0.5 rounded transition-all ${colors.bar} group-hover:brightness-110`}
            style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%`, minWidth: '3px' }}
            title={`${nodeName} - ${formatDuration(duration)}`}
          />
        </div>
      </div>

      {/* 耗时 */}
      <div className="text-right flex flex-col justify-center">
        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{formatDuration(duration)}</p>
        <p className="text-[10px] text-gray-400">{formatDuration(offsetMs)}</p>
      </div>
    </div>
  )
}

function NodeDetailPanel({ node, onClose }) {
  if (!node) return null
  const displayName = prettifyNodeName(node.nodeName || node.methodName || node.nodeId)
  const duration = resolveNodeDuration(node)
  const s = normalizeStatus(node.status)

  return (
    <div className="border border-[#e5e5e5] dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#1c1c1e]">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] dark:border-[#333]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate" title={displayName}>
            {displayName}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded font-medium border ${statusBadgeClass(node.status)}`}>
            {statusLabel(node.status)}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${nodeTypeChipClass(node.nodeType)}`}>
            {node.nodeType || '-'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* 内容 */}
      <div className="px-4 py-3 space-y-3">
        {/* 字段网格 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
          <Field label="Node Id" value={node.nodeId} mono copyable />
          <Field label="Parent Id" value={node.parentNodeId || '-'} mono copyable={!!node.parentNodeId} />
          <Field label="耗时" value={formatDuration(duration)} highlight />
          <Field label="深度" value={String(node.depth ?? 0)} />
          <Field label="开始" value={formatTime(node.startTime)} />
          <Field label="结束" value={formatTime(node.endTime)} />
          {node.className && <Field label="类" value={node.className} mono />}
          {node.methodName && <Field label="方法" value={node.methodName} mono />}
        </div>

        {/* 错误信息 */}
        {node.errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-[12px]">
              <p className="font-medium text-red-800 dark:text-red-300 mb-1">错误信息</p>
              <p className="text-red-700 dark:text-red-400 whitespace-pre-wrap break-all">{node.errorMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, mono, copyable, highlight }) {
  const highlightClass = highlight ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-[#1d1d1f] dark:text-[#f5f5f7]'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-gray-400 dark:text-gray-500 shrink-0">{label}</span>
      <span
        className={`truncate ${mono ? 'font-mono' : ''} ${highlightClass} ${copyable ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''}`}
        title={value}
        onClick={copyable ? () => navigator.clipboard.writeText(value) : undefined}
      >
        {value}
      </span>
      {copyable && <Copy size={11} className="text-gray-300 dark:text-gray-600 shrink-0" />}
    </div>
  )
}

function TimeScale({ totalMs }) {
  const ticks = [0, 25, 50, 75, 100]
  return (
    <div className="relative h-6 border-b border-[#e5e5e5] dark:border-[#333]">
      {ticks.map(pct => (
        <div
          key={pct}
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-px h-2 bg-[#e5e5e5] dark:bg-[#333]" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {formatDuration((totalMs * pct) / 100)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============ 主组件 ============

export default function TraceDetail() {
  const params = useParams()
  const navigate = useNavigate()
  const traceId = params.traceId ? decodeURIComponent(params.traceId) : ''
  const requestRef = useRef(0)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState(null)

  const loadDetail = async (tid) => {
    if (!tid) return
    const reqId = ++requestRef.current
    setLoading(true)
    try {
      const data = await http.get(`/api/v1/traces/${encodeURIComponent(tid)}`)
      if (reqId !== requestRef.current) return
      setDetail(data)
    } catch (e) {
      if (reqId !== requestRef.current) return
      console.error('加载链路详情失败:', e)
      setDetail(null)
    } finally {
      if (reqId !== requestRef.current) return
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail(traceId)
  }, [traceId])

  const run = detail?.run || null
  const nodes = detail?.nodes || []

  // 构建时序数据
  const timeline = useMemo(() => {
    if (!nodes.length && !run) return { totalWindowMs: 0, rows: [] }

    const normalized = nodes.map(node => {
      const startTs = toTimestamp(node.startTime)
      const endTs = toTimestamp(node.endTime)
      const dur = resolveNodeDuration(node)
      const depth = Math.max(0, Number(node.depth ?? 0)) + 1
      const sTs = startTs ?? 0
      const eTs = endTs ?? (sTs > 0 ? sTs + dur : 0)
      return { ...node, depthValue: depth, resolvedDurationMs: dur, startTs: sTs, endTs: eTs }
    })

    const withTime = normalized.filter(n => n.startTs > 0)
    const runStartTs = toTimestamp(run?.startTime)
    const baseStart = runStartTs || (withTime.length ? withTime.reduce((m, n) => Math.min(m, n.startTs), withTime[0].startTs) : Date.now())
    const runEndTs = toTimestamp(run?.endTime)
    const maxEnd = withTime.length ? withTime.reduce((m, n) => Math.max(m, n.endTs || n.startTs), withTime[0].endTs || withTime[0].startTs) : baseStart
    const runDuration = Number(run?.durationMs ?? 0)
    const resolvedRunEnd = runEndTs || (runDuration > 0 ? baseStart + runDuration : maxEnd)
    const windowDuration = Math.max(resolvedRunEnd - baseStart, runDuration, maxEnd - baseStart, 1)

    // 根节点行
    const rootRow = run ? {
      nodeId: '__root__',
      parentNodeId: null,
      depth: -1,
      nodeType: 'ROOT',
      nodeName: run.traceName || 'rag-stream-chat',
      className: null,
      methodName: run.entryMethod || null,
      status: run.status,
      errorMessage: run.errorMessage,
      durationMs: run.durationMs ?? null,
      startTime: run.startTime ?? null,
      endTime: run.endTime ?? null,
      depthValue: 0,
      resolvedDurationMs: Math.max(resolvedRunEnd - baseStart, 1),
      startTs: baseStart,
      endTs: resolvedRunEnd,
    } : null

    // 用 parentNodeId 构建树
    const childrenMap = new Map()
    const treeRoots = []
    for (const n of normalized) {
      if (n.parentNodeId) {
        const siblings = childrenMap.get(n.parentNodeId) || []
        siblings.push(n)
        childrenMap.set(n.parentNodeId, siblings)
      } else {
        treeRoots.push(n)
      }
    }

    // 同级按时间排序
    const sortFn = (a, b) => a.startTs - b.startTs || a.depthValue - b.depthValue
    treeRoots.sort(sortFn)
    for (const siblings of childrenMap.values()) siblings.sort(sortFn)

    // DFS 顺序
    const ordered = []
    const stack = [...treeRoots].reverse()
    while (stack.length) {
      const n = stack.pop()
      ordered.push(n)
      const children = childrenMap.get(n.nodeId)
      if (children) {
        for (let i = children.length - 1; i >= 0; i--) stack.push(children[i])
      }
    }

    const orderedSet = new Set(ordered.map(n => n.nodeId))
    for (const n of normalized) {
      if (!orderedSet.has(n.nodeId)) ordered.push(n)
    }

    const rows = [...(rootRow ? [rootRow] : []), ...ordered].map(node => {
      const offsetMs = node.startTs > 0 ? Math.max(0, node.startTs - baseStart) : 0
      return { ...node, offsetMs }
    })

    return { totalWindowMs: windowDuration, rows }
  }, [nodes, run])

  // 统计
  const stats = useMemo(() => {
    const total = nodes.length
    const failed = nodes.filter(n => normalizeStatus(n.status) === 'failed' || normalizeStatus(n.status) === 'error').length
    const success = nodes.filter(n => normalizeStatus(n.status) === 'success').length
    const running = nodes.filter(n => normalizeStatus(n.status) === 'running').length
    const durations = nodes.map(n => resolveNodeDuration(n))
    const avgDuration = total > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / total) : 0
    const sorted = [...nodes].sort((a, b) => resolveNodeDuration(b) - resolveNodeDuration(a))
    const topSlowestId = sorted[0]?.nodeId
    return { total, failed, success, running, avgDuration, topSlowestId }
  }, [nodes])

  const activeNode = useMemo(() => {
    if (!activeNodeId) return null
    return nodes.find(n => n.nodeId === activeNodeId) || null
  }, [nodes, activeNodeId])

  // 加载中
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-[13px]">加载链路详情中...</p>
        </div>
      </div>
    )
  }

  // 无数据
  if (!traceId || !run) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-4 shrink-0">
          <button
            onClick={() => navigate('/admin/traces')}
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={15} />
            返回链路列表
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <AlertTriangle size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-[14px]">{!traceId ? '缺少 Trace Id' : '暂无数据'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ====== 标题栏 ====== */}
      <div className="px-8 py-4 shrink-0 border-b border-[#e5e5e5] dark:border-[#333]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/traces')}
              className="p-1.5 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="返回列表"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
                {run.traceName || '链路详情'}
                <span className={`text-[11px] px-2 py-0.5 rounded font-medium border ${statusBadgeClass(run.status)}`}>
                  {statusLabel(run.status)}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadDetail(traceId)}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-medium
                border border-[#d2d2d7] dark:border-[#38383a]
                text-gray-600 dark:text-gray-400
                hover:bg-black/5 dark:hover:bg-white/10
                transition-colors duration-200"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>

        {/* 元信息 */}
        <div className="flex items-center gap-4 mt-2 text-[12px] text-gray-500 dark:text-gray-400">
          <span
            className="font-mono cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
            onClick={() => navigator.clipboard.writeText(traceId)}
            title="点击复制 Trace Id"
          >
            <Hash size={12} />
            {traceId.length > 28 ? `${traceId.slice(0, 12)}...${traceId.slice(-8)}` : traceId}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {formatTime(run.startTime)}
          </span>
          {run.userId && (
            <span className="flex items-center gap-1">
              <User size={12} />
              {run.userId}
            </span>
          )}
        </div>
      </div>

      {/* ====== 内容区 ====== */}
      <div className="flex-1 overflow-auto px-8 py-5 space-y-5">
        {/* 错误提示 */}
        {run.errorMessage && (
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-[13px]">
              <span className="font-medium text-red-800 dark:text-red-300">执行出错：</span>
              <span className="text-red-600 dark:text-red-400 ml-1">{run.errorMessage}</span>
            </div>
          </div>
        )}

        {/* 指标条 */}
        <div className="flex items-center bg-[#f9f9f9] dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5e5] dark:border-[#333] divide-x divide-[#e5e5e5] dark:divide-[#333] overflow-hidden">
          <MetricItem icon={Clock} label="总耗时" value={formatDuration(run.durationMs)} variant="primary" />
          {run.ttftMs != null && (
            <MetricItem icon={Zap} label="首包耗时" value={formatDuration(run.ttftMs)} variant="primary" />
          )}
          <MetricItem icon={Activity} label="节点" value={stats.total} />
          <MetricItem icon={CheckCircle2} label="成功" value={stats.success} variant="success" />
          <MetricItem icon={XCircle} label="失败" value={stats.failed} variant={stats.failed > 0 ? 'error' : 'default'} />
          {stats.running > 0 && (
            <MetricItem icon={Loader2} label="运行中" value={stats.running} variant="warning" />
          )}
          <MetricItem icon={Zap} label="平均耗时" value={formatDuration(stats.avgDuration)} />
        </div>

        {/* 瀑布图 */}
        <div className="border border-[#e5e5e5] dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#1c1c1e]">
          {/* 瀑布图头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] dark:border-[#333]">
            <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">执行时序</span>
            <span className="text-[11px] text-gray-400">窗口 {formatDuration(timeline.totalWindowMs)}</span>
          </div>

          <div className="p-0">
            {timeline.rows.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Activity size={36} className="mx-auto mb-3 opacity-50" />
                <p className="text-[13px]">暂无节点记录</p>
              </div>
            ) : (
              <>
                {/* 表头 */}
                <div className="grid grid-cols-[1fr_100px_2fr_90px] gap-3 px-4 py-2 text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-[#f9f9f9] dark:bg-[#1c1c1e] border-b border-[#e5e5e5] dark:border-[#333]">
                  <span>节点</span>
                  <span>类型</span>
                  <span>时间线</span>
                  <span className="text-right">耗时</span>
                </div>

                {/* 时间刻度 */}
                <div className="grid grid-cols-[1fr_100px_2fr_90px] gap-3 px-4 bg-white dark:bg-[#1c1c1e]">
                  <div />
                  <div />
                  <TimeScale totalMs={timeline.totalWindowMs} />
                  <div />
                </div>

                {/* 瀑布行 */}
                <div className="divide-y divide-[#f5f5f5] dark:divide-[#222]">
                  {timeline.rows.map((node) => {
                    const displayName = prettifyNodeName(node.nodeName || node.methodName || node.nodeId)
                    const isRoot = node.nodeId === '__root__'
                    const isSelected = node.nodeId === activeNodeId
                    const isTopSlowest = node.nodeId === stats.topSlowestId

                    return (
                      <WaterfallBar
                        key={node.nodeId}
                        depth={node.depthValue}
                        nodeName={displayName}
                        nodeType={node.nodeType}
                        duration={node.resolvedDurationMs}
                        offsetMs={node.offsetMs}
                        totalMs={timeline.totalWindowMs}
                        status={node.status}
                        isSelected={isSelected}
                        isRoot={isRoot}
                        onClick={isRoot ? undefined : () => setActiveNodeId(isSelected ? null : node.nodeId)}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 节点详情面板 */}
        {activeNode && (
          <NodeDetailPanel
            node={activeNode}
            onClose={() => setActiveNodeId(null)}
          />
        )}
      </div>
    </div>
  )
}
