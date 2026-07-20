import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Clock, Activity, TrendingUp, CheckCircle2, XCircle, Loader2, Eye, Copy } from 'lucide-react'
import { http } from '../../utils/http'

const PAGE_SIZE = 10

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
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '-'
  }
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
  if (s === 'success') return '成功'
  if (s === 'error' || s === 'failed') return '失败'
  if (s === 'running') return '运行中'
  return s.toUpperCase() || '未知'
}

const STATUS_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  failed: XCircle,
  running: Loader2,
}

function StatusBadge({ status }) {
  const s = normalizeStatus(status)
  const Icon = STATUS_ICONS[s] || CheckCircle2
  const isRunning = s === 'running'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border ${statusBadgeClass(status)}`}>
      <Icon size={12} className={isRunning ? 'animate-spin' : ''} />
      {statusLabel(status)}
    </span>
  )
}

function StatCard({ title, value, unit, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#f9f9f9] dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5e5] dark:border-[#333]">
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-gray-500 dark:text-gray-400">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{value}</span>
          {unit && <span className="text-[12px] text-gray-400 dark:text-gray-500">{unit}</span>}
        </div>
      </div>
    </div>
  )
}

export default function TraceList() {
  const navigate = useNavigate()
  const requestRef = useRef(0)
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [traceIdFilter, setTraceIdFilter] = useState('')
  const [queryTraceId, setQueryTraceId] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadRuns = async (currentPage, searchTraceId) => {
    const reqId = ++requestRef.current
    setLoading(true)
    try {
      const params = { page: currentPage, size: PAGE_SIZE }
      if (searchTraceId?.trim()) {
        params.traceId = searchTraceId.trim()
      }
      const data = await http.get('/api/v1/traces', { query: params })
      if (reqId !== requestRef.current) return
      setRuns(data.records || [])
      setTotal(data.total || 0)
    } catch (e) {
      if (reqId !== requestRef.current) return
      console.error('加载链路列表失败:', e)
      setRuns([])
    } finally {
      if (reqId !== requestRef.current) return
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRuns(page, queryTraceId)
  }, [page, queryTraceId])

  const handleSearch = () => {
    setPage(1)
    setQueryTraceId(traceIdFilter.trim())
  }

  const handleRefresh = () => {
    loadRuns(page, queryTraceId)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const stats = useMemo(() => {
    const successCount = runs.filter(r => normalizeStatus(r.status) === 'success').length
    const failedCount = runs.filter(r => normalizeStatus(r.status) === 'error' || normalizeStatus(r.status) === 'failed').length
    const runningCount = runs.filter(r => normalizeStatus(r.status) === 'running').length
    const durations = runs.map(r => Number(r.durationMs ?? 0)).filter(d => d > 0)
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
    const ttftValues = runs.map(r => Number(r.ttftMs ?? 0)).filter(d => d > 0)
    const avgTtft = ttftValues.length ? Math.round(ttftValues.reduce((a, b) => a + b, 0) / ttftValues.length) : 0
    const successRate = runs.length ? Math.round((successCount / runs.length) * 100) : 0
    return { totalRuns: total, successCount, failedCount, runningCount, avgDuration, avgTtft, successRate }
  }, [runs, total])

  const goPage = (p) => {
    if (p < 1 || p > totalPages) return
    setPage(p)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 页面标题 */}
      <div className="px-8 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">链路追踪</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
          查看 RAG 流式对话的执行链路、各节点耗时与状态
        </p>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-6 space-y-5">
        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="成功 / 失败 / 运行中"
            value={`${stats.successCount} / ${stats.failedCount} / ${stats.runningCount}`}
            icon={<Activity size={16} />}
            color="blue"
          />
          <StatCard
            title="成功率"
            value={`${stats.successRate}%`}
            icon={<TrendingUp size={16} />}
            color="green"
          />
          <StatCard
            title="平均耗时"
            value={stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : '-'}
            icon={<Clock size={16} />}
            color="indigo"
          />
          <StatCard
            title="平均首字耗时"
            value={stats.avgTtft > 0 ? formatDuration(stats.avgTtft) : '-'}
            icon={<Clock size={16} />}
            color="amber"
          />
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={traceIdFilter}
              onChange={(e) => setTraceIdFilter(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索 Trace Id…"
              className="w-full pl-10 pr-4 py-2 text-[14px] rounded-lg
                bg-[#f5f5f7] dark:bg-[#1c1c1e]
                text-[#1d1d1f] dark:text-[#f5f5f7]
                placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                border border-transparent
                focus:outline-none focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                transition-colors duration-200"
            />
          </div>
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-[14px] font-medium
              bg-blue-600 text-white hover:bg-blue-700
              transition-colors duration-200 active:scale-[0.98]"
          >
            <Search size={15} />
            查询
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-[14px] font-medium
              border border-[#d2d2d7] dark:border-[#38383a]
              text-gray-600 dark:text-gray-400
              hover:bg-black/5 dark:hover:bg-white/10
              transition-colors duration-200"
          >
            <RefreshCw size={15} />
            刷新
          </button>
        </div>

        {/* 表格 */}
        <div className="overflow-hidden rounded-xl border border-[#e5e5e5] dark:border-[#333]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f5f5f7] dark:bg-[#1c1c1e] text-gray-500 dark:text-gray-400">
                <th className="text-left px-4 py-3 font-medium">用户问题</th>
                <th className="text-left px-3 py-3 font-medium">Trace Id</th>
                <th className="text-left px-3 py-3 font-medium">用户</th>
                <th className="text-left px-3 py-3 font-medium">耗时</th>
                <th className="text-left px-3 py-3 font-medium">首字</th>
                <th className="text-left px-3 py-3 font-medium">状态</th>
                <th className="text-left px-3 py-3 font-medium whitespace-nowrap">执行时间</th>
                <th className="text-center px-3 py-3 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#333]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <Loader2 size={20} className="inline animate-spin mr-2" />
                    加载中...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-500">
                    {queryTraceId ? '未找到匹配的链路记录' : '暂无链路数据'}
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr
                    key={run.traceId}
                    className="hover:bg-[#f9f9f9] dark:hover:bg-[#1c1c1e]/50 transition-colors"
                  >
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-[#1d1d1f] dark:text-[#f5f5f7] truncate block" title={run.question || ''}>
                        {run.question || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[12px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={run.traceId}>
                          {run.traceId}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(run.traceId)
                          }}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-300 hover:text-gray-500 transition-colors shrink-0"
                          title="复制 Trace Id"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                      {run.userId || '-'}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 font-mono text-[12px]">
                      {formatDuration(run.durationMs)}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 font-mono text-[12px]">
                      {run.ttftMs != null ? formatDuration(run.ttftMs) : '-'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-[12px]">
                      {formatTime(run.startTime)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => navigate(`/admin/traces/${encodeURIComponent(run.traceId)}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium
                          text-blue-600 dark:text-blue-400
                          hover:bg-blue-50 dark:hover:bg-blue-900/20
                          transition-colors"
                      >
                        <Eye size={13} />
                        详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between text-[13px] text-gray-500 dark:text-gray-400">
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
      </div>
    </div>
  )
}
