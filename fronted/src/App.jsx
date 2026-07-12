import { useState, useMemo, useRef, useCallback } from 'react'
import { PanelLeft } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'

// 测试用固定会话 ID
const TEST_SESSION_ID = '2ebd1fc83bfe465b8237419a00b19c41'

export default function App() {
  const [conversations, setConversations] = useState([
    {
      id: TEST_SESSION_ID,
      title: '测试对话',
      createdAt: new Date().toISOString(),
      messages: [],
    },
  ])
  const [currentId, setCurrentId] = useState(TEST_SESSION_ID)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,
  )
  const [isTyping, setIsTyping] = useState(false)
  const eventSourceRef = useRef(null)

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === currentId) || null,
    [conversations, currentId],
  )

  // Dark mode
  const applyDarkMode = useCallback((dm) => {
    document.documentElement.classList.toggle('dark', dm)
    document.body.classList.toggle('dark', dm)
  }, [])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      applyDarkMode(!prev)
      return !prev
    })
  }

  // Apply on first render
  useState(() => applyDarkMode(darkMode))

  const sendMessage = useCallback((text) => {
    const assistantMsgId = `msg-${Date.now()}-a`
    const userMsgId = `msg-${Date.now()}-u`

    // 1. 添加用户消息 + 空的 assistant 占位
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== TEST_SESSION_ID) return c
        return {
          ...c,
          messages: [
            ...c.messages,
            { id: userMsgId, role: 'user', content: text, timestamp: new Date().toISOString() },
            { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
          ],
        }
      }),
    )

    // 2. SSE 请求后端（固定传测试 sessionId）
    const url = `/api/chat?message=${encodeURIComponent(text)}&sessionId=${TEST_SESSION_ID}`

    setIsTyping(true)
    const es = new EventSource(url)
    eventSourceRef.current = es

    let assistantContent = ''

    es.addEventListener('message', (e) => {
      assistantContent += e.data
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== TEST_SESSION_ID) return c
          const updatedMsgs = c.messages.map((m) =>
            m.id === assistantMsgId ? { ...m, content: assistantContent } : m,
          )
          return { ...c, messages: updatedMsgs }
        }),
      )
    })

    es.addEventListener('done', () => {
      es.close()
      eventSourceRef.current = null
      setIsTyping(false)
    })

    es.addEventListener('error', () => {
      if (eventSourceRef.current) {
        es.close()
        eventSourceRef.current = null
        setIsTyping(false)
      }
    })
  }, [])

  const stopTyping = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsTyping(false)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#141414]">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        collapsed={sidebarCollapsed}
        darkMode={darkMode}
        onNewChat={() => setCurrentId(TEST_SESSION_ID)}
        onSelectChat={setCurrentId}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        onToggleDark={toggleDarkMode}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        {sidebarCollapsed && (
          <button
            className="absolute top-3 left-3 z-20 p-2 rounded-xl bg-white dark:bg-[#1c1c1c]
              hover:bg-gray-50 dark:hover:bg-[#222] transition-colors shadow-sm"
            onClick={() => setSidebarCollapsed(false)}
          >
            <PanelLeft size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        )}

        <ChatArea
          conversation={currentConversation}
          isTyping={isTyping}
          onSend={sendMessage}
          onStop={stopTyping}
          onSelectSuggestion={sendMessage}
        />
      </main>
    </div>
  )
}
