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
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="pb-5 pt-2">
      <div
        className="flex flex-col rounded-2xl transition-all duration-200
          bg-[#f4f4f4] dark:bg-[#2a2a2a]
          ring-1 ring-[#e5e5e5] dark:ring-[#333]
          focus-within:ring-2 focus-within:ring-[#d1d1d1] dark:focus-within:ring-[#444]
          focus-within:bg-[#f9f9f9] dark:focus-within:bg-[#2f2f2f]"
      >
        <textarea
          ref={textareaRef}
          value={text}
          disabled={disabled}
          rows={1}
          placeholder={isTyping ? 'AI 正在回复...' : '输入消息...'}
          className="w-full resize-none bg-transparent border-none outline-none text-[15px] leading-relaxed
            text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            py-3 px-4 max-h-[200px]"
          onChange={(e) => {
            setText(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          onInput={autoResize}
        />

        {/* Bottom row: future actions left, send/stop right */}
        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left: function buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-7 h-7 rounded-lg flex items-center justify-center
                text-gray-400 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]
                hover:bg-black/5 dark:hover:bg-white/10
                transition-all duration-150"
              title="上传文档"
            >
              <Upload size={16} />
            </button>
          </div>

          {/* Right: stop / send */}
          {isTyping ? (
            <button
              className="shrink-0 w-9 h-9 rounded-full bg-gray-800 dark:bg-gray-200
                flex items-center justify-center transition-all duration-150 hover:scale-105"
              onClick={() => onStop?.()}
            >
              <Square size={14} className="text-white dark:text-gray-800" fill="currentColor" />
            </button>
          ) : (
            <button
              disabled={!text.trim() || disabled}
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 ${
                text.trim() && !disabled
                  ? 'bg-[var(--color-text-primary)] dark:bg-white hover:scale-105 cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              }`}
              onClick={handleSend}
            >
              <ArrowUp
                size={20}
                className={text.trim() && !disabled ? 'text-white dark:text-gray-900' : 'text-white/70'}
              />
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2.5">
        RAG Studio 可能产生不准确的信息，请注意甄别
      </p>
    </div>
  )
}
