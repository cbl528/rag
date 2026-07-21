import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * 通用弹窗组件
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  confirmDanger = false,
  loading = false,
  children,
  onConfirm,
  onCancel,
}) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onCancel?.() }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" />

      <div
        className="relative w-[460px] max-w-[90vw] rounded-2xl
          bg-white dark:bg-[#1c1c1e]
          shadow-[0_16px_48px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]
          p-8 animate-fade-in-up"
      >
        <button
          className="absolute top-5 right-5 p-1.5 rounded-xl
            text-[#aeaeb2] dark:text-[#636366]
            hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]
            hover:bg-black/5 dark:hover:bg-white/10
            transition-all duration-150"
          onClick={onCancel}
        >
          <X size={20} />
        </button>

        <h2 className="text-[18px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5 pr-8">
          {title}
        </h2>

        {description && (
          <p className="text-[15px] text-[#86868b] dark:text-[#98989d] leading-relaxed mt-3">
            {description}
          </p>
        )}

        {children && <div className="mt-5">{children}</div>}

        <div className="flex items-center justify-end gap-3 mt-7">
          <button
            className="py-2.5 px-6 rounded-xl text-[15px] font-medium
              bg-[#f4f4f4] dark:bg-[#2a2a2a]
              text-[#1d1d1f] dark:text-[#f5f5f7]
              hover:bg-[#e8e8e8] dark:hover:bg-[#333]
              transition-all duration-150
              active:scale-[0.98]"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`py-2.5 px-6 rounded-xl text-[15px] font-semibold
              transition-all duration-150 shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-[0.98]
              ${confirmDanger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] hover:opacity-85'
              }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                处理中...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
