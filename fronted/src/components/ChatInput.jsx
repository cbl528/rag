import { useState, useRef } from 'react'
import { ArrowUp, Square, Upload } from 'lucide-react'

export default function ChatInput({ disabled, isTyping, onSend, onStop }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || disabled || isTyping) return
    onSend?.(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }

  return (
    <div className="pb-6 pt-3">
      <div
        className="flex flex-col rounded-2xl transition-all duration-200
          bg-white dark:bg-[#1c1c1e]
          ring-1 ring-[#e0e0e0] dark:ring-[#333]
          focus-within:ring-2 focus-within:ring-[#1d1d1f] dark:focus-within:ring-[#f5f5f7]
          shadow-sm focus-within:shadow-md"
      >
        <textarea
          ref={textareaRef}
          value={text}
          disabled={disabled}
          rows={1}
          placeholder={isTyping ? 'AI 正在回复...' : '输入消息...'}
          className="w-full resize-none bg-transparent border-none outline-none focus-visible:outline-none text-[16px] leading-relaxed
            text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            py-4 px-5 max-h-[200px]"
          onChange={(e) => { setText(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          onInput={autoResize}
        />

        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-8 h-8 rounded-xl flex items-center justify-center
                text-gray-400 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]
                hover:bg-black/5 dark:hover:bg-white/10
                transition-all duration-150"
              title="上传文档"
            >
              <Upload size={18} strokeWidth={1.5} />
            </button>
          </div>

          {isTyping ? (
            <button
              className="shrink-0 w-10 h-10 rounded-full bg-gray-800 dark:bg-gray-200
                flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 shadow-sm"
              onClick={() => onStop?.()}
            >
              <Square size={15} className="text-white dark:text-gray-800" fill="currentColor" />
            </button>
          ) : (
            <button
              disabled={!text.trim() || disabled}
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 shadow-sm ${
                text.trim() && !disabled
                  ? 'bg-[var(--color-text-primary)] dark:bg-white hover:scale-110 active:scale-95 cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              }`}
              onClick={handleSend}
            >
              <ArrowUp
                size={21}
                strokeWidth={2.5}
                className={text.trim() && !disabled ? 'text-white dark:text-gray-900' : 'text-white/70'}
              />
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[12px] text-gray-400 dark:text-gray-500 mt-3">
        RAG Studio 可能产生不准确的信息，请注意甄别
      </p>
    </div>
  )
}
