import { useState, useRef, useCallback, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { http } from './utils/http'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import LoginPage from './pages/LoginPage'

function MainLayout() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,
  )
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const eventSourceRef = useRef(null)

  // ---------- API 调用 ----------

  const fetchConversations = useCallback(async () => {
    try {
      const data = await http.get('/api/v1/conversation')
      // 标准化字段命名，兼容 Sidebar 的 groupByDate 等逻辑
      setConversations(
        (data || []).map((item) => ({
          id: item.sessionId,
          title: item.title,
          createdAt: item.createTime,
          lastTime: item.lastTime,
        })),
      )
    } catch (e) {
      console.error('加载会话列表失败', e)
    }
  }, [])

  const fetchMessages = useCallback(async (sessionId) => {
    try {
      const data = await http.get(`/api/v1/conversation/${sessionId}/messages`)
      setMessages(data || [])
    } catch (e) {
      console.error('加载消息失败', e)
    }
  }, [])

  // 首次加载会话列表
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // 切换会话时加载消息
  useEffect(() => {
    if (currentId) {
      fetchMessages(currentId)
    } else {
      setMessages([])
    }
  }, [currentId, fetchMessages])

  // ---------- 深色模式 ----------

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

  // 首次渲染时应用深色模式
  useState(() => applyDarkMode(darkMode))

  // ---------- 聊天 SSE ----------

  const sendMessage = useCallback(
    (text) => {
      const assistantMsgId = `temp-${Date.now()}-a`

      // 1. 立即追加用户消息 + 空占位
      setMessages((prev) => [
        ...prev,
        { id: `temp-${Date.now()}-u`, role: 'user', content: text },
        { id: assistantMsgId, role: 'assistant', content: '' },
      ])

      // 2. 调 SSE（带 token 参数解决 EventSource 无法设请求头的问题）
      const params = { message: text }
      if (currentId) {
        params.sessionId = currentId
      }
      const url = http.getSseUrl('/api/v1/rag/chat', params)

      setIsTyping(true)
      const es = new EventSource(url)
      eventSourceRef.current = es

      let newSessionId = currentId
      let assistantContent = ''

      es.addEventListener('session', (e) => {
        newSessionId = e.data
      })

      // 后端鉴权失败 → 跳转登录页
      es.addEventListener('error', () => {
        es.close()
        eventSourceRef.current = null
        setIsTyping(false)
        navigate('/login', { replace: true })
      })

      es.addEventListener('message', (e) => {
        assistantContent += e.data
        setMessages((prev) => {
          const msgs = [...prev]
          const last = msgs[msgs.length - 1]
          if (last && last.id === assistantMsgId) {
            msgs[msgs.length - 1] = { ...last, content: assistantContent }
          }
          return msgs
        })
      })

      es.addEventListener('done', () => {
        es.close()
        eventSourceRef.current = null
        setIsTyping(false)

        // 新创建的会话 → 设为当前会话
        if (newSessionId && newSessionId !== currentId) {
          setCurrentId(newSessionId)
        }
        // 刷新会话列表（获取最新标题等）
        fetchConversations()
      })
    },
    [currentId, fetchConversations],
  )

  const stopTyping = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsTyping(false)
  }, [])

  const handleNewChat = useCallback(() => {
    setCurrentId(null)
    setMessages([])
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#141414]">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        collapsed={sidebarCollapsed}
        onNewChat={handleNewChat}
        onSelectChat={setCurrentId}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
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
          currentId={currentId}
          messages={messages}
          isTyping={isTyping}
          onSend={sendMessage}
          onStop={stopTyping}
          onSelectSuggestion={sendMessage}
          darkMode={darkMode}
          onToggleDark={toggleDarkMode}
        />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </AuthProvider>
  )
}
