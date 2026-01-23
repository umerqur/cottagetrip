import { useState } from 'react'
import { getSupabase } from '../lib/supabase'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'heic']

interface ReceiptUploadProps {
  roomId: string
  expenseId: string
  onSuccess: (receiptPath: string) => void
  onError: (error: string) => void
  disabled?: boolean
}

export default function ReceiptUpload({
  roomId,
  expenseId,
  onSuccess,
  onError,
  disabled = false
}: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const validateFile = (file: File): string | null => {
    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB'
    }

    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      onError(error)
      return
    }

    setSelectedFile(file)
    setUploadProgress(0)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    const supabase = getSupabase()
    if (!supabase) {
      onError('Supabase is not configured')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Build receipt path: rooms/{roomId}/receipts/{expenseId}/{timestamp}_{originalFileName}
      const timestamp = Date.now()
      const fileName = selectedFile.name
      const receiptPath = `rooms/${roomId}/receipts/${expenseId}/${timestamp}_${fileName}`

      // Upload file
      const { data, error: uploadError } = await supabase.storage
        .from('cottage_images')
        .upload(receiptPath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading receipt:', uploadError)
        onError(uploadError.message)
        setUploading(false)
        return
      }

      setUploadProgress(100)
      onSuccess(data.path)
      setUploading(false)
    } catch (err) {
      console.error('Unexpected error uploading receipt:', err)
      onError('Failed to upload receipt')
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadProgress(0)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#2F241A]">
        Receipt <span className="text-red-500">*</span>
        <span className="ml-2 text-xs text-[#6B5C4D] font-normal">
          (PNG, JPG, PDF, HEIC - max 10MB)
        </span>
      </label>

      {selectedFile ? (
        <div className="space-y-3">
          {/* Preview or file info */}
          <div className="relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-gray-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="absolute top-2 right-2 bg-white/95 backdrop-blur rounded-full p-2 text-gray-700 hover:bg-white hover:text-red-600 transition shadow-sm disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#2F241A] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-[#6B5C4D] text-center">Uploading... {uploadProgress}%</p>
            </div>
          )}

          {/* Upload button */}
          {!uploading && uploadProgress === 0 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={disabled}
              className="w-full rounded-lg bg-[#2F241A] px-4 py-2.5 font-semibold text-white hover:bg-[#1F1812] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm"
            >
              Upload Receipt
            </button>
          )}

          {/* Success state */}
          {uploadProgress === 100 && !uploading && (
            <div className="flex items-center justify-center gap-2 text-green-700">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Receipt uploaded</span>
            </div>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-2 text-sm text-gray-600">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, PDF, HEIC up to 10MB</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".png,.jpg,.jpeg,.pdf,.heic"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
        </label>
      )}
    </div>
  )
}
