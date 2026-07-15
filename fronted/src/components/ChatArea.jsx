import { useRef, useEffect } from 'react'
import WelcomeScreen from './WelcomeScreen'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

export default function ChatArea({ currentId, messages, isTyping, onSend, onStop, onSelectSuggestion }) {
  const scrollRef = useRef(null)

  const noConversation = !currentId && messages.length === 0

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages?.length, isTyping, currentId])

  return (
    <div className="relative flex-1 min-h-0 bg-white dark:bg-[#141414] transition-colors duration-200">
      {/* Content — 绝对定位填满容器，独立滚动 */}
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
        {noConversation ? (
          <WelcomeScreen onSelectSuggestion={onSelectSuggestion} />
        ) : (
          <div className="max-w-[960px] mx-auto px-6 py-6 space-y-6 pt-14 pb-40">
            {messages.map((msg) => (
              <MessageBubble key={msg.id || `${msg.role}-${msg.createTime}`} message={msg} />
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="animate-fade-in-up pl-1">
                <div className="flex items-center gap-1 py-2">
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-dot-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-dot-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-dot-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — 绝对定位固定在底部，不参与消息流布局 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#141414]">
        <div className="max-w-[960px] mx-auto w-full px-6">
          <ChatInput isTyping={isTyping} onSend={onSend} onStop={onStop} />
        </div>
      </div>
    </div>
  )
}
