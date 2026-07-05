import { Sparkles } from 'lucide-react'

const suggestions = [
  '帮我解释什么是 RAG 技术',
  '如何优化文档分块策略',
  '中文 Embedding 模型推荐',
  '设计一个知识检索流程',
]

export default function WelcomeScreen({ onSelectSuggestion }) {
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
      <div className="grid grid-cols-2 gap-3 max-w-[640px] w-full">
        {suggestions.map((s) => (
          <button
            key={s}
            className="text-left px-5 py-3.5 rounded-xl text-[14px] leading-snug transition-colors duration-150
              border border-[#e5e5e5] dark:border-[#333]
              text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary-dark)]
              hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
            onClick={() => onSelectSuggestion?.(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
