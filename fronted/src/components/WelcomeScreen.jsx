import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { http } from '../utils/http'

export default function WelcomeScreen({ onSelectSuggestion }) {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    http.get('/api/v1/sample-questions')
      .then(data => setSuggestions(data || []))
      .catch(() => { /* 静默失败，保留空列表 */ })
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      {/* Logo */}
      <div className="flex items-center justify-center mb-8">
        <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center
          bg-[var(--color-text-primary)] dark:bg-white">
          <Sparkles size={30} className="text-white dark:text-[var(--color-text-primary)]" />
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-[26px] font-semibold tracking-tight mb-8 text-center
        text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
        有什么我可以帮你的？
      </h1>

      {/* Suggestion Cards */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-w-[640px] w-full">
          {suggestions.map((s) => (
            <button
              key={s.id}
              className="text-left px-5 py-3.5 rounded-xl text-[14px] leading-snug transition-colors duration-150
                border border-[#e5e5e5] dark:border-[#333]
                text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary-dark)]
                hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
              onClick={() => onSelectSuggestion?.(s.question)}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
