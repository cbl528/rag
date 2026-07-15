import { useState, useRef, useCallback, useEffect } from 'react'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { http } from './utils/http'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import ChatArea from './components/ChatArea'
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import UploadDoc from './pages/admin/UploadDoc'

// ---------- 路由守卫 ----------
function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-[#141414]">
        <div className="w-6 h-6 border-2 border-[#1d1d1f] dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return children
}

function MainLayout() {
  const navigate = useNavigate()
  const { logout } = useAuth()
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
      const list = (data || []).map((item) => ({
        id: item.sessionId,
        title: item.title,
        createdAt: item.createTime,
        lastTime: item.lastTime,
      }))
      setConversations(list)
      // 如果当前会话已被删除，重置 currentId
      setCurrentId((prev) => {
        if (prev && !list.some((c) => c.id === prev)) {
          return null
        }
        return prev
      })
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

      // 后端鉴权失败 → 清除失效 token 后跳转登录页
      es.addEventListener('error', () => {
        es.close()
        eventSourceRef.current = null
        setIsTyping(false)
        logout()
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
    [currentId, fetchConversations, logout, navigate],
  )

  const stopTyping = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsTyping(false)
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

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
        onLogout={handleLogout}
        onRefreshConversations={fetchConversations}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <Navbar
          title={conversations.find((c) => c.id === currentId)?.title}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(false)}
          darkMode={darkMode}
          onToggleDark={toggleDarkMode}
        />
        <ChatArea
          currentId={currentId}
          messages={messages}
          isTyping={isTyping}
          onSend={sendMessage}
          onStop={stopTyping}
          onSelectSuggestion={sendMessage}
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
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route path="upload" element={<UploadDoc />} />
                  <Route path="*" element={<Navigate to="upload" replace />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
