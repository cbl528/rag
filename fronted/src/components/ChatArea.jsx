import { useRef, useEffect } from 'react'
import WelcomeScreen from './WelcomeScreen'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

export default function ChatArea({ conversation, isTyping, onSend, onStop, onSelectSuggestion }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation?.messages?.length, isTyping, conversation?.id])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141414] transition-colors duration-200">
      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!conversation ? (
          <WelcomeScreen onSelectSuggestion={onSelectSuggestion} />
        ) : (
          <div className="max-w-[768px] mx-auto px-4 py-6 space-y-8">
            {conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-4 items-start animate-fade-in-up">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--color-text-primary)] dark:bg-gray-200 flex items-center justify-center mt-0.5">
                  <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full" />
                </div>
                <div className="flex items-center gap-1 py-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-dot-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-dot-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-dot-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`max-w-[768px] mx-auto w-full px-4 ${!conversation ? 'max-w-[680px]' : ''}`}>
        <ChatInput isTyping={isTyping} onSend={onSend} onStop={onStop} />
      </div>
    </div>
  )
}
