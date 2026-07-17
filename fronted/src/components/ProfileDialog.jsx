import { useState, useEffect, useRef } from 'react'
import { X, User, Check, KeyRound, LogOut, PencilLine, EyeOff, Eye, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { http } from '../utils/http'

export default function ProfileDialog({ open, onClose }) {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()

  // —— 昵称编辑 ——
  const [nickname, setNickname] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)
  const [nicknameMessage, setNicknameMessage] = useState(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const nicknameInputRef = useRef(null)

  // —— 修改密码 ——
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPwd, setShowOldPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState(null)

  // —— 切换账户 ——
  const [switching, setSwitching] = useState(false)

  // 初始化昵称
  useEffect(() => {
    if (open && user) {
      setNickname(user.nickname || '')
      setNicknameMessage(null)
      setPasswordMessage(null)
      setEditingNickname(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [open, user])

  // 打开弹窗时从服务端拉取最新用户信息
  useEffect(() => {
    if (open) {
      refreshUser()
    }
  }, [open, refreshUser])

  // 编辑昵称自动聚焦
  useEffect(() => {
    if (editingNickname && nicknameInputRef.current) {
      nicknameInputRef.current.focus()
    }
  }, [editingNickname])

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // —— 保存昵称 ——
  const handleSaveNickname = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setNicknameMessage({ type: 'error', text: '昵称不能为空' })
      return
    }
    if (trimmed === (user?.nickname || '')) {
      setEditingNickname(false)
      return
    }
    setSavingNickname(true)
    setNicknameMessage(null)
    try {
      await http.put('/api/v1/auth/profile', { nickname: trimmed })
      await refreshUser()
      setNicknameMessage({ type: 'success', text: '昵称已更新' })
      setEditingNickname(false)
    } catch (e) {
      setNicknameMessage({ type: 'error', text: e.message || '保存失败' })
    } finally {
      setSavingNickname(false)
    }
  }

  // —— 修改密码 ——
  const handleChangePassword = async () => {
    if (!oldPassword) {
      setPasswordMessage({ type: 'error', text: '请输入当前密码' })
      return
    }
    if (!newPassword) {
      setPasswordMessage({ type: 'error', text: '请输入新密码' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: '新密码至少 6 位' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '两次输入的新密码不一致' })
      return
    }
    setChangingPassword(true)
    setPasswordMessage(null)
    try {
      await http.put('/api/v1/auth/password', { oldPassword, newPassword })
      setPasswordMessage({ type: 'success', text: '密码修改成功' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      setPasswordMessage({ type: 'error', text: e.message || '修改失败' })
    } finally {
      setChangingPassword(false)
    }
  }

  // —— 切换账户 ——
  const handleSwitchAccount = async () => {
    setSwitching(true)
    try {
      await logout()
    } catch {
      // ignore
    }
    navigate('/login', { replace: true })
  }

  // —— 获取头像首字母 ——
  const getInitial = () => {
    const name = user?.username || 'U'
    return name.charAt(0).toUpperCase()
  }

  const overlayRef = useRef(null)

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.()
      }}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" />

      {/* 弹窗卡片 */}
      <div
        className="relative w-[440px] max-w-[92vw] max-h-[85vh] overflow-y-auto rounded-2xl
          bg-white dark:bg-[#1c1c1e]
          shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]
          animate-fade-in-up"
      >
        {/* 关闭按钮 */}
        <button
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg
            text-[#aeaeb2] dark:text-[#636366]
            hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]
            hover:bg-black/5 dark:hover:bg-white/10
            transition-all duration-150"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        {/* ======== 用户信息头部 ======== */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6">
          {/* 头像 */}
          <div className="relative mb-4">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-[#e5e5e5] dark:ring-[#333]"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center
                  bg-gradient-to-br from-[#1d1d1f] to-[#555] dark:from-[#f5f5f7] dark:to-[#999]
                  ring-2 ring-[#e5e5e5] dark:ring-[#333]"
              >
                <span className="text-[32px] font-semibold text-white dark:text-[#1d1d1f] select-none">
                  {getInitial()}
                </span>
              </div>
            )}
          </div>

          {/* 用户名 */}
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {user?.username || '用户'}
          </h2>

          {/* 昵称 */}
          {user?.nickname && user.nickname !== user?.username && (
            <p className="text-[13px] text-[#86868b] dark:text-[#98989d] mt-0.5">
              {user.nickname}
            </p>
          )}
        </div>

        {/* ======== 内容区 ======== */}
        <div className="px-6 pb-6 space-y-6">

          {/* 分隔线 */}
          <div className="border-t border-[#e5e5e5] dark:border-[#333]" />

          {/* ====== 昵称修改 ====== */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PencilLine size={15} className="text-[#86868b] dark:text-[#98989d]" />
                <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  昵称
                </h3>
              </div>
              {!editingNickname && (
                <button
                  onClick={() => setEditingNickname(true)}
                  className="text-[12px] font-medium text-[#0071E3] hover:text-[#0066CC] dark:text-[#40A9FF] transition-colors"
                >
                  编辑
                </button>
              )}
            </div>

            {editingNickname ? (
              <div className="space-y-2.5">
                <input
                  ref={nicknameInputRef}
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value)
                    setNicknameMessage(null)
                  }}
                  placeholder="输入昵称"
                  maxLength={30}
                  disabled={savingNickname}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNickname()
                    if (e.key === 'Escape') {
                      setEditingNickname(false)
                      setNickname(user?.nickname || '')
                      setNicknameMessage(null)
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-[14px] rounded-xl
                    bg-[#f4f4f4] dark:bg-[#2a2a2a]
                    text-[#1d1d1f] dark:text-[#f5f5f7]
                    placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                    border border-transparent focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                    focus:outline-none transition-colors duration-200
                    disabled:opacity-50"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#aeaeb2] dark:text-[#636366]">
                    {nickname.length}/30
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingNickname(false)
                        setNickname(user?.nickname || '')
                        setNicknameMessage(null)
                      }}
                      disabled={savingNickname}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-lg
                        text-[#86868b] dark:text-[#98989d]
                        hover:bg-[#f4f4f4] dark:hover:bg-[#2a2a2a]
                        transition-colors duration-150"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveNickname}
                      disabled={savingNickname}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-lg
                        bg-[#1d1d1f] dark:bg-white
                        text-white dark:text-[#1d1d1f]
                        hover:opacity-85 transition-all duration-150
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-1"
                    >
                      {savingNickname ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      保存
                    </button>
                  </div>
                </div>
                {/* 昵称操作反馈 */}
                {nicknameMessage && (
                  <p className={`text-[12px] ${
                    nicknameMessage.type === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}>
                    {nicknameMessage.text}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7] pl-0.5">
                {user?.nickname || <span className="text-[#aeaeb2] dark:text-[#636366]">未设置</span>}
              </p>
            )}
          </section>

          {/* 分隔线 */}
          <div className="border-t border-[#e5e5e5] dark:border-[#333]" />

          {/* ====== 修改密码 ====== */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={15} className="text-[#86868b] dark:text-[#98989d]" />
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                修改密码
              </h3>
            </div>

            <div className="space-y-3">
              {/* 当前密码 */}
              <div className="relative">
                <input
                  type={showOldPwd ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => { setOldPassword(e.target.value); setPasswordMessage(null) }}
                  placeholder="当前密码"
                  disabled={changingPassword}
                  className="w-full px-3.5 py-2.5 text-[14px] rounded-xl pr-10
                    bg-[#f4f4f4] dark:bg-[#2a2a2a]
                    text-[#1d1d1f] dark:text-[#f5f5f7]
                    placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                    border border-transparent focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                    focus:outline-none transition-colors duration-200
                    disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPwd(!showOldPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-[#aeaeb2] dark:text-[#636366]
                    hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
                  tabIndex={-1}
                >
                  {showOldPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* 新密码 */}
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordMessage(null) }}
                  placeholder="新密码（至少 6 位）"
                  disabled={changingPassword}
                  className="w-full px-3.5 py-2.5 text-[14px] rounded-xl pr-10
                    bg-[#f4f4f4] dark:bg-[#2a2a2a]
                    text-[#1d1d1f] dark:text-[#f5f5f7]
                    placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                    border border-transparent focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                    focus:outline-none transition-colors duration-200
                    disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-[#aeaeb2] dark:text-[#636366]
                    hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
                  tabIndex={-1}
                >
                  {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* 确认新密码 */}
              <div className="relative">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMessage(null) }}
                  placeholder="确认新密码"
                  disabled={changingPassword}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleChangePassword()
                  }}
                  className="w-full px-3.5 py-2.5 text-[14px] rounded-xl pr-10
                    bg-[#f4f4f4] dark:bg-[#2a2a2a]
                    text-[#1d1d1f] dark:text-[#f5f5f7]
                    placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366]
                    border border-transparent focus:border-[#1d1d1f] dark:focus:border-[#f5f5f7]
                    focus:outline-none transition-colors duration-200
                    disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-[#aeaeb2] dark:text-[#636366]
                    hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* 密码反馈 */}
              {passwordMessage && (
                <p className={`text-[12px] ${
                  passwordMessage.type === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {passwordMessage.text}
                </p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full py-2.5 rounded-xl text-[13px] font-medium
                  bg-[#f4f4f4] dark:bg-[#2a2a2a]
                  text-[#1d1d1f] dark:text-[#f5f5f7]
                  hover:bg-[#e8e8e8] dark:hover:bg-[#333]
                  transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-[0.98]
                  flex items-center justify-center gap-1.5"
              >
                {changingPassword ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    修改中...
                  </>
                ) : (
                  '更新密码'
                )}
              </button>
            </div>
          </section>

          {/* 分隔线 */}
          <div className="border-t border-[#e5e5e5] dark:border-[#333]" />

          {/* ====== 切换账户 ====== */}
          <button
            onClick={handleSwitchAccount}
            disabled={switching}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium
              bg-red-50 dark:bg-red-500/10
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-500/20
              border border-red-100 dark:border-red-500/20
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-[0.98]
              flex items-center justify-center gap-2"
          >
            <LogOut size={15} />
            {switching ? '切换中...' : '切换账户'}
          </button>

          {/* 提示文案 */}
          <p className="text-center text-[11px] text-[#aeaeb2] dark:text-[#636366]">
            切换账户将退出当前登录
          </p>
        </div>
      </div>
    </div>
  )
}
