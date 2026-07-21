import { User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  if (!message.content && !isUser) {
    return null
  }

  return (
    <div className={`animate-fade-in-up ${isUser ? 'flex justify-end' : ''}`}>
      <div className={isUser ? 'max-w-[75%]' : ''}>
        {isUser ? (
          <p className="text-[16px] leading-relaxed px-5 py-3.5 rounded-2xl
            bg-[#f0f0f0] dark:bg-[#2a2a2a]
            text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]
            shadow-sm">
            {message.content}
          </p>
        ) : (
          <div className="prose-content text-[16px] leading-[1.85]
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
    </div>
  )
}
