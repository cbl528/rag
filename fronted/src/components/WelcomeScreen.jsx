import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { http } from '../utils/http'

export default function WelcomeScreen({ onSelectSuggestion }) {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    http.get('/api/v1/sample-questions')
      .then(data => setSuggestions(data || []))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      {/* Logo */}
      <div className="flex items-center justify-center mb-10">
        <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center
          bg-[var(--color-text-primary)] dark:bg-white shadow-lg">
          <Sparkles size={36} strokeWidth={1.5} className="text-white dark:text-[var(--color-text-primary)]" />
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-[30px] font-bold tracking-tight mb-10 text-center leading-tight
        text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
        有什么我可以帮你的？
      </h1>

      {/* Suggestion Cards */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-2 gap-4 max-w-[680px] w-full">
          {suggestions.map((s) => (
            <button
              key={s.id}
              className="text-left px-6 py-4 rounded-2xl text-[15px] font-medium leading-snug transition-all duration-200
                border border-[#e5e5e5] dark:border-[#333]
                text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary-dark)]
                hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]
                hover:border-[#d1d1d1] dark:hover:border-[#444]
                hover:shadow-sm
                active:scale-[0.98]"
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
