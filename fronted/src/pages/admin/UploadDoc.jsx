import { useState, useRef } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function UploadDoc() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.txt') || droppedFile.name.endsWith('.md'))) {
      setFile(droppedFile)
      setResult(null)
      setError(null)
    } else {
      setError('仅支持 .txt 和 .md 文件')
    }
  }

  const handleSelect = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      setResult(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const { http } = await import('../../utils/http')
      const data = await http.post('/api/v1/admin/document/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setResult({ success: true, message: `上传成功！共 ${data.chunkCount || '-'} 个文档片段` })
      setFile(null)
    } catch (err) {
      setError(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-6">
        文档上传
      </h1>

      {/* 拖拽上传区域 */}
      {!file && (
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
      )}

      {/* 已选文件 */}
      {file && (
        <div className="border border-[#d2d2d7] dark:border-[#38383a] rounded-xl p-4 bg-white dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File size={20} className="text-blue-500" />
              <div>
                <p className="text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">{file.name}</p>
                <p className="text-[12px] text-gray-400 dark:text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
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

      {/* 成功提示 */}
      {result && (
        <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2 text-[13px] text-green-700 dark:text-green-300">
          <CheckCircle size={16} />
          {result.message}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-[13px] text-red-700 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  )
}
