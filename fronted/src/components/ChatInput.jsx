import { useState, useRef } from 'react'
import { ArrowUp, Square } from 'lucide-react'

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
        className="relative flex items-end gap-2 p-2.5 rounded-[28px] transition-all duration-200
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
          className="flex-1 resize-none bg-transparent border-none outline-none text-[15px] leading-relaxed
            text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            py-1.5 px-2 max-h-[160px]"
          onChange={(e) => {
            setText(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          onInput={autoResize}
        />

        {/* Stop */}
        {isTyping ? (
          <button
            className="shrink-0 w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-200
              flex items-center justify-center transition-all duration-150 hover:scale-105"
            onClick={() => onStop?.()}
          >
            <Square size={12} className="text-white dark:text-gray-800" fill="currentColor" />
          </button>
        ) : (
          /* Send */
          <button
            disabled={!text.trim() || disabled}
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${
              text.trim() && !disabled
                ? 'bg-[var(--color-text-primary)] dark:bg-white hover:scale-105 cursor-pointer'
                : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
            }`}
            onClick={handleSend}
          >
            <ArrowUp
              size={18}
              className={text.trim() && !disabled ? 'text-white dark:text-gray-900' : 'text-white/70'}
            />
          </button>
        )}
      </div>

      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2.5">
        RAG Studio 可能产生不准确的信息，请注意甄别
      </p>
    </div>
  )
}
