import { useState, useEffect, useRef } from 'react'
import { Upload, File as FileIcon, FileText, X, CheckCircle, AlertCircle, Loader2, Clock, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { http } from '../../utils/http'

const STATUS_MAP = {
  uploading: { label: '上传中', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
  chunking: { label: '解析中', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  embedding: { label: '向量化中', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  storing: { label: '存储中', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  indexed: { label: '已完成', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  failed: { label: '失败', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
}

export default function UploadDoc() {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [listLoading, setListLoading] = useState(true)

  // 上传相关
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  const [mode, setMode] = useState('list') // 'list' | 'upload'

  // 加载文档列表
  const loadDocuments = async () => {
    try {
      const list = await http.get('/api/v1/admin/documents')
      setDocuments(list || [])
    } catch (err) {
      console.error('加载文档列表失败:', err)
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  // 选中文档 → 预览
  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc)
    setMode('list')
    setPreviewContent('')
    setPreviewError(null)

    if (!doc.fileUrl) {
      setPreviewError('该文档暂无可预览的源文件')
      return
    }

    // 根据类型决定预览方式
    if (doc.fileType === 'txt' || doc.fileType === 'md') {
      setPreviewLoading(true)
      fetch(doc.fileUrl)
        .then(res => {
          if (!res.ok) throw new Error('文件读取失败')
          return res.text()
        })
        .then(text => {
          setPreviewContent(text)
        })
        .catch(err => {
          setPreviewError(err.message || '预览加载失败')
        })
        .finally(() => {
          setPreviewLoading(false)
        })
    } else {
      // 其他格式（PDF 等）直接嵌入
      setPreviewLoading(false)
    }
  }

  // ============ 上传流程 ============

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.txt') || droppedFile.name.endsWith('.md'))) {
      setUploadFile(droppedFile)
      setUploadResult(null)
      setUploadError(null)
    } else {
      setUploadError('仅支持 .txt 和 .md 文件')
    }
  }

  const handleSelect = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setUploadFile(selected)
      setUploadResult(null)
      setUploadError(null)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    setUploadResult(null)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      const data = await http.upload('/api/v1/admin/document/upload', formData)

      setUploadResult({ success: true, message: `上传成功！共 ${data.chunkCount || '-'} 个文档片段` })

      // 刷新文档列表并选中新文档
      await loadDocuments()
      // 回到列表模式，选中刚上传的文档
      setMode('list')
      setSelectedDoc(null)
      setUploadFile(null)
    } catch (err) {
      setUploadError(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const switchToUpload = () => {
    setMode('upload')
    setUploadFile(null)
    setUploadResult(null)
    setUploadError(null)
  }

  const formatSize = (bytes) => {
    if (!bytes) return '-'
    const kb = bytes / 1024
    if (kb < 1024) return kb.toFixed(1) + ' KB'
    return (kb / 1024).toFixed(1) + ' MB'
  }

  const formatTime = (time) => {
    if (!time) return ''
    const d = new Date(time)
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#e5e5e5] dark:border-[#222] shrink-0">
        <h1 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">文档管理</h1>
        <div className="flex items-center gap-3">
          {mode === 'upload' && (
            <button
              onClick={() => { setMode('list'); setSelectedDoc(null) }}
              className="px-3 py-1.5 text-[13px] rounded-lg border border-[#d2d2d7] dark:border-[#38383a]
                text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              返回列表
            </button>
          )}
          <button
            onClick={switchToUpload}
            className="px-4 py-1.5 text-[13px] font-medium rounded-lg bg-blue-600 text-white
              hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <Upload size={14} />
            上传新文档
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ============ 左侧：文档列表 ============ */}
        {mode === 'list' && (
          <aside className="w-[300px] shrink-0 border-r border-[#e5e5e5] dark:border-[#222] flex flex-col bg-[#fafafa] dark:bg-[#111]">
            {/* 标题 */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e5e5] dark:border-[#222]">
              <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">文件列表</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{documents.length} 项</span>
            </div>

            {/* 列表 */}
            <div className="flex-1 overflow-y-auto">
              {listLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <FileText size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-[13px] text-gray-400 dark:text-gray-500">暂无文档</p>
                  <p className="text-[12px] text-gray-300 dark:text-gray-600 mt-1">点击右上角上传新文档</p>
                </div>
              ) : (
                <div className="py-1">
                  {documents.map((doc) => {
                    const statusInfo = STATUS_MAP[doc.status] || { label: doc.status, color: '' }
                    const isSelected = selectedDoc?.docId === doc.docId
                    const isFailed = doc.status === 'failed'

                    return (
                      <button
                        key={doc.docId}
                        onClick={() => handleSelectDoc(doc)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors
                          ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                            : 'border-l-2 border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                      >
                        {/* 文件图标 */}
                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-[12px] font-medium
                          ${doc.fileType === 'md' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                          {doc.fileType?.toUpperCase()}
                        </div>

                        {/* 文件信息 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                            {doc.fileName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[11px] px-1.5 py-0.5 rounded border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                              {formatSize(doc.fileSize)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatTime(doc.createTime)}
                          </p>
                          {isFailed && doc.errorMessage && (
                            <p className="text-[11px] text-red-500 mt-0.5 truncate" title={doc.errorMessage}>
                              {doc.errorMessage}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ============ 右侧：内容区 ============ */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#141414]">
          {/* 上传模式 */}
          {mode === 'upload' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-lg">
                {!uploadFile ? (
                  <>
                    {/* 拖拽上传 */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#d2d2d7] dark:border-[#38383a]
                        rounded-xl p-12 text-center cursor-pointer
                        hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                    >
                      <Upload size={40} className="mx-auto mb-3 text-gray-400" />
                      <p className="text-[14px] text-gray-500 dark:text-gray-400">
                        拖拽文件到此处，或点击选择文件
                      </p>
                      <p className="text-[12px] text-gray-400 mt-1">
                        支持 .txt、.md 格式
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md"
                        className="hidden"
                        onChange={handleSelect}
                      />
                    </div>
                  </>
                ) : (
                  /* 已选文件 */
                  <div className="border border-[#d2d2d7] dark:border-[#38383a] rounded-xl p-4 bg-white dark:bg-[#1c1c1e]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileIcon size={20} className="text-blue-500" />
                        <div>
                          <p className="text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">{uploadFile.name}</p>
                          <p className="text-[12px] text-gray-400">
                            {(uploadFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setUploadFile(null); setUploadResult(null); setUploadError(null) }}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      >
                        <X size={16} className="text-gray-400" />
                      </button>
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="mt-4 w-full py-2.5 rounded-lg text-[14px] font-medium
                        bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50
                        transition-colors flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          正在上传并处理...
                        </>
                      ) : (
                        '上传文档'
                      )}
                    </button>
                  </div>
                )}

                {/* 上传成功提示 */}
                {uploadResult && (
                  <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2 text-[13px] text-green-700 dark:text-green-300">
                    <CheckCircle size={16} />
                    {uploadResult.message}
                  </div>
                )}

                {/* 上传错误提示 */}
                {uploadError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-[13px] text-red-700 dark:text-red-300">
                    <AlertCircle size={16} />
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 预览模式 */
            <>
              {!selectedDoc ? (
                /* 未选中：显示空状态或快捷上传 */
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <FileText size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-[15px] text-gray-400 dark:text-gray-500">从左侧列表选择一个文档查看预览</p>
                  <p className="text-[13px] text-gray-300 dark:text-gray-600 mt-1">或点击右上角「上传新文档」</p>
                </div>
              ) : (
                /* 选中了文档 */
                <div className="flex-1 flex flex-col min-h-0">
                  {/* 文件信息头 */}
                  <div className="flex items-center gap-3 px-6 py-3 border-b border-[#e5e5e5] dark:border-[#222] shrink-0">
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-[12px] font-medium
                      ${selectedDoc.fileType === 'md' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                      {selectedDoc.fileType?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                        {selectedDoc.fileName}
                      </h2>
                      <p className="text-[12px] text-gray-400 dark:text-gray-500">
                        {formatSize(selectedDoc.fileSize)} · {selectedDoc.chunkCount || 0} 个分片
                        {selectedDoc.createTime && ` · ${formatTime(selectedDoc.createTime)}`}
                      </p>
                    </div>
                  </div>

                  {/* 预览内容 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {previewLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                        <span className="ml-2 text-[13px] text-gray-400">加载预览中...</span>
                      </div>
                    ) : previewError ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <AlertCircle size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-[13px] text-red-500">{previewError}</p>
                      </div>
                    ) : selectedDoc.fileType === 'pdf' ? (
                      <iframe
                        src={selectedDoc.fileUrl}
                        className="w-full h-full border-0 rounded-lg"
                        title="PDF 预览"
                      />
                    ) : selectedDoc.fileType === 'md' ? (
                      <div className="max-w-none text-[14px] leading-relaxed text-[#1d1d1f] dark:text-[#e5e5e7]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {previewContent || '（文件内容为空）'}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <pre className="text-[13px] leading-relaxed text-[#1d1d1f] dark:text-[#e5e5e7]
                        whitespace-pre-wrap break-words font-mono">
                        {previewContent || '（文件内容为空）'}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
