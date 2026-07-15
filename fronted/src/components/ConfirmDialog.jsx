import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * 通用弹窗组件
 *
 * 用法：
 *   <ConfirmDialog
 *     open={showDelete}
 *     title="删除对话"
 *     description="您确定要删除该对话吗，一旦删除无法恢复。"
 *     confirmLabel="删除"
 *     confirmDanger
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *   />
 *
 *   <ConfirmDialog
 *     open={showRename}
 *     title="重命名对话"
 *     onConfirm={handleRename}
 *     onCancel={() => setShowRename(false)}
 *   >
 *     <input ... />
 *   </ConfirmDialog>
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

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel?.()
      }}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" />

      {/* 弹窗卡片 */}
      <div
        className="relative w-[360px] max-w-[90vw] rounded-2xl
          bg-white dark:bg-[#1c1c1e]
          shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]
          p-6 animate-fade-in-up"
      >
        {/* 关闭按钮 */}
        <button
          className="absolute top-4 right-4 p-1 rounded-lg
            text-[#aeaeb2] dark:text-[#636366]
            hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]
            hover:bg-black/5 dark:hover:bg-white/10
            transition-all duration-150"
          onClick={onCancel}
        >
          <X size={18} />
        </button>

        {/* 标题 */}
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1 pr-6">
          {title}
        </h2>

        {/* 描述或自定义内容 */}
        {description && (
          <p className="text-[14px] text-[#86868b] dark:text-[#98989d] leading-relaxed mt-2">
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        {/* 按钮组 */}
        <div className="flex items-center gap-2.5 mt-6">
          <button
            className="flex-1 py-2.5 px-4 rounded-xl text-[14px] font-medium
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
            className={`flex-1 py-2.5 px-4 rounded-xl text-[14px] font-medium
              transition-all duration-150
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
