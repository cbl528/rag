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

  // 打字中的占位消息（无内容）
  if (!message.content && !isUser) {
    return null
  }

  return (
    <div className={`animate-fade-in-up ${isUser ? 'flex justify-end' : ''}`}>
      {isUser ? (
        /* 用户消息 — 气泡样式 */
        <div className="max-w-[75%]">
          <p className="text-[16px] leading-relaxed px-5 py-3 rounded-2xl
            bg-[#f4f4f4] dark:bg-[#2a2a2a]
            text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
            {message.content}
          </p>
        </div>
      ) : (
        /* AI 回复 — 无边界纯文本 */
        <div>
          <div className="prose-content text-[16px] leading-[1.8]
            text-[var(--color-text-primary)] dark:text-[var(--color-text-primary-dark)]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
