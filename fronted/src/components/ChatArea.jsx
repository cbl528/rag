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
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
        {noConversation ? (
          <WelcomeScreen onSelectSuggestion={onSelectSuggestion} />
        ) : (
          <div className="max-w-[960px] mx-auto px-8 py-6 space-y-6 pt-16 pb-44">
            {messages.map((msg) => (
              <MessageBubble key={msg.id || `${msg.role}-${msg.createTime}`} message={msg} />
            ))}

            {isTyping && (
              <div className="animate-fade-in-up">
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

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#141414] dark:via-[#141414]/95 dark:to-transparent pt-8">
        <div className="max-w-[960px] mx-auto w-full px-8">
          <ChatInput isTyping={isTyping} onSend={onSend} onStop={onStop} />
        </div>
      </div>
    </div>
  )
}
