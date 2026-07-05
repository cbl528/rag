import { User, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* AI Avatar */}
      {!isUser && (
        <div className="shrink-0 mt-1">
          <div className="w-7 h-7 rounded-full bg-[var(--color-text-primary)] dark:bg-gray-200 flex items-center justify-center">
            <Bot size={15} className="text-white dark:text-gray-800" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-[85%] min-w-0">
        {isUser ? (
          <p className="text-[15px] leading-relaxed px-5 py-3 rounded-2xl
            bg-[#f4f4f4] dark:bg-[#2a2a2a]
            text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
            {message.content}
          </p>
        ) : (
          <div className="prose-content text-[15px] leading-relaxed
            text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="shrink-0 mt-1">
          <div className="w-7 h-7 rounded-full bg-[#b3b3b3] dark:bg-gray-600 flex items-center justify-center">
            <User size={15} className="text-white" />
          </div>
        </div>
      )}
    </div>
  )
}
