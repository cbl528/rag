import { useState, useEffect, useRef } from 'react'
import {
  Users, FileText, MessageSquare, Activity, Database, Clock,
  Zap, TrendingUp, CheckCircle2, XCircle, Loader2, RefreshCw
} from 'lucide-react'
import { http } from '../../utils/http'

function formatMs(ms) {
  if (ms == null || isNaN(ms) || ms <= 0) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  const m = Math.floor(ms / 60000)
  const s = ((ms % 60000) / 1000).toFixed(1)
  return `${m}m ${s}s`
}

function formatNum(n) {
  if (n == null) return '0'
  return n.toLocaleString('zh-CN')
}

function KpiCard({ title, value, icon, color, subtitle }) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5e5] dark:border-[#333]">
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-0.5">{value}</p>
        {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function SimpleBarChart({ data, height = 160, color = 'var(--color-accent, #0071E3)' }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data, 1)
  const barWidth = Math.max(8, Math.min(24, 480 / data.length))
  const gap = 4

  return (
    <div className="flex items-end gap-[4px] h-full" style={{ gap: `${gap}px` }}>
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <div
            className="w-full rounded-t-sm transition-all duration-500 ease-out"
            style={{
              height: `${Math.max((v / max) * height, v > 0 ? 4 : 0)}px`,
              backgroundColor: color,
              opacity: v > 0 ? 0.85 : 0.15,
              maxWidth: `${barWidth}px`,
            }}
            title={`${v}`}
          />
        </div>
      ))}
    </div>
  )
}

function TrendChart({ data, dates, label, color }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data, 1)
  const showLabels = dates && dates.length > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-gray-500 dark:text-gray-400 font-medium">{label}</span>
        <span className="text-gray-400 dark:text-gray-500">
          峰值 {formatNum(max)} · 总计 {formatNum(data.reduce((a, b) => a + b, 0))}
        </span>
      </div>
      <div className="relative h-[120px]">
        {/* Y轴参考线 */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2].map(i => (
            <div key={i} className="border-b border-dashed border-[#e5e5e5] dark:border-[#333] h-0" />
          ))}
        </div>
        {/* 柱子 */}
        <div className="absolute inset-0 flex items-end gap-[3px]" style={{ padding: '0 2px' }}>
          {data.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max((v / max) * 110, v > 0 ? 3 : 0)}px`,
                  backgroundColor: color,
                  opacity: v > 0 ? 0.8 : 0.1,
                }}
                title={`${dates?.[i] || ''}: ${v}`}
              />
            </div>
          ))}
        </div>
      </div>
      {/* X轴标签 */}
      {showLabels && (
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 pt-1">
          {dates.filter((_, i) => i % Math.max(1, Math.floor(dates.length / 7)) === 0 || i === dates.length - 1).map((d, idx, arr) => {
            const i = dates.indexOf(d)
            return <span key={i} style={{ visibility: i === 0 || i === dates.length - 1 || idx > 0 ? 'visible' : 'hidden' }}>{d}</span>
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminHome() {
  const requestRef = useRef(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = async () => {
    const reqId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await http.get('/api/v1/admin/dashboard', { query: { trendDays: 14 } })
      if (reqId !== requestRef.current) return
      setData(result)
    } catch (e) {
      if (reqId !== requestRef.current) return
      setError(e.message || '加载仪表盘失败')
      console.error(e)
    } finally {
      if (reqId !== requestRef.current) return
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const overview = data?.overview
  const perf = data?.performance
  const trends = data?.trends

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="px-8 py-4 shrink-0 flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#333]">
        <div>
          <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">控制台</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            系统运行概览与关键指标
          </p>
        </div>
        <button
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium
            border border-[#d2d2d7] dark:border-[#38383a]
            text-gray-600 dark:text-gray-400
            hover:bg-black/5 dark:hover:bg-white/10
            transition-colors duration-200 active:scale-[0.98]"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto px-8 py-5 space-y-6">
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[13px] text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {overview && (
          <>
            {/* ====== KPI 卡片区 ====== */}
            <section>
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-3">数据总览</h2>
              <div className="grid grid-cols-4 gap-4">
                <KpiCard
                  title="用户总数"
                  value={formatNum(overview.totalUsers)}
                  icon={<Users size={16} />}
                  color="blue"
                />
                <KpiCard
                  title="文档总数"
                  value={formatNum(overview.totalDocuments)}
                  icon={<FileText size={16} />}
                  color="green"
                  subtitle={`${formatNum(overview.totalChunks)} 个知识分片`}
                />
                <KpiCard
                  title="对话总数"
                  value={formatNum(overview.totalSessions)}
                  icon={<MessageSquare size={16} />}
                  color="indigo"
                  subtitle={`今日 +${formatNum(overview.todaySessions)}`}
                />
                <KpiCard
                  title="消息总数"
                  value={formatNum(overview.totalMessages)}
                  icon={<Activity size={16} />}
                  color="purple"
                  subtitle={`今日 +${formatNum(overview.todayMessages)}`}
                />
                <KpiCard
                  title="链路追踪"
                  value={formatNum(overview.totalTraces)}
                  icon={<Database size={16} />}
                  color="sky"
                />
              </div>
            </section>

            {/* ====== 性能指标 ====== */}
            {perf && (
              <section>
                <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-3">性能指标</h2>
                <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5e5] dark:border-[#333] overflow-hidden">
                  <div className="flex items-center divide-x divide-[#e5e5e5] dark:divide-[#333]">
                    <div className="flex items-center gap-2.5 px-5 py-3.5 flex-1">
                      <Clock size={15} className="text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-base font-semibold text-blue-600 dark:text-blue-400">{formatMs(perf.avgLatencyMs)}</p>
                        <p className="text-[11px] text-gray-400">平均响应耗时</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 px-5 py-3.5 flex-1">
                      <Zap size={15} className="text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{formatMs(perf.avgTtftMs)}</p>
                        <p className="text-[11px] text-gray-400">平均首字耗时</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 px-5 py-3.5 flex-1">
                      <TrendingUp size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400">{perf.successRate}%</p>
                        <p className="text-[11px] text-gray-400">成功率</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 px-5 py-3.5 flex-1">
                      <CheckCircle2 size={15} className="text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-base font-semibold text-green-600 dark:text-green-400">{formatNum(perf.successRuns)}</p>
                        <p className="text-[11px] text-gray-400">成功</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 px-5 py-3.5 flex-1">
                      <XCircle size={15} className={`${perf.failedRuns > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      <div>
                        <p className={`text-base font-semibold ${perf.failedRuns > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{formatNum(perf.failedRuns)}</p>
                        <p className="text-[11px] text-gray-400">失败</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ====== 趋势图 ====== */}
            {trends && trends.dates && trends.dates.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-3">近 14 天趋势</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5e5] dark:border-[#333] p-4">
                    <TrendChart
                      data={trends.sessions}
                      dates={trends.dates}
                      label="会话数"
                      color="#0071E3"
                    />
                  </div>
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5e5] dark:border-[#333] p-4">
                    <TrendChart
                      data={trends.messages}
                      dates={trends.dates}
                      label="消息数"
                      color="#34C759"
                    />
                  </div>
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5e5] dark:border-[#333] p-4">
                    <TrendChart
                      data={trends.traces}
                      dates={trends.dates}
                      label="链路运行"
                      color="#AF52DE"
                    />
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
