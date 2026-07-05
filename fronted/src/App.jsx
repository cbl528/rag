import { useState, useMemo, useRef, useCallback } from 'react'
import { PanelLeft } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import { initialConversations, getSimulatedReply } from './data/mockData'

export default function App() {
  const [conversations, setConversations] = useState(() =>
    initialConversations.map((c) => ({ ...c, messages: [...c.messages] })),
  )
  const [currentId, setCurrentId] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,
  )
  const [isTyping, setIsTyping] = useState(false)
  const typingTimer = useRef(null)

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

  const sendMessage = useCallback(
    (text) => {
      let id = currentId
      let convs = conversations

      if (!id) {
        const newConv = {
          id: `conv-${Date.now()}`,
          title: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
          createdAt: new Date().toISOString(),
          messages: [],
        }
        convs = [newConv, ...conversations]
        id = newConv.id
        setConversations(convs)
        setCurrentId(id)
      }

      const convIndex = convs.findIndex((c) => c.id === id)
      if (convIndex === -1) return
      const conv = convs[convIndex]
      const updatedMessages = [
        ...conv.messages,
        { id: `msg-${Date.now()}-u`, role: 'user', content: text, timestamp: new Date().toISOString() },
      ]
      const updatedConv = {
        ...conv,
        messages: updatedMessages,
        title: conv.messages.length === 0 ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : conv.title,
      }
      const newConvs = [...convs]
      newConvs[convIndex] = updatedConv
      setConversations(newConvs)

      setIsTyping(true)
      typingTimer.current = setTimeout(() => {
        setIsTyping(false)
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === id)
          if (idx === -1) return prev
          const c = prev[idx]
          const newMsgs = [
            ...c.messages,
            {
              id: `msg-${Date.now()}-a`,
              role: 'assistant',
              content: getSimulatedReply(text),
              timestamp: new Date().toISOString(),
            },
          ]
          const updated = [...prev]
          updated[idx] = { ...c, messages: newMsgs }
          return updated
        })
      }, 1500 + Math.random() * 1000)
    },
    [currentId, conversations],
  )

  const stopTyping = useCallback(() => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
      typingTimer.current = null
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
        onNewChat={() => setCurrentId(null)}
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
