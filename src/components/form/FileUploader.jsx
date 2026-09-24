import { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { UploadCloud, File as FileIcon, X } from 'lucide-react'
import clsx from 'clsx'
import { validateFile } from '../../lib/uploads'
import { formatFileSize } from '../../lib/format'
import { ACCEPTED_FILE_EXTENSIONS } from '../../lib/constants'

export default function FileUploader({ files, onChange, multiple = true, label, hint }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const addFiles = useCallback(
    (incoming) => {
      const valid = []
      for (const file of incoming) {
        const error = validateFile(file)
        if (error) {
          toast.error(error)
        } else {
          valid.push(file)
        }
      }
      if (valid.length) {
        onChange(multiple ? [...files, ...valid] : [valid[0]])
      }
    },
    [files, multiple, onChange]
  )

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const removeAt = (index) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-[13px] font-medium font-body text-slate-600">{label}</p>}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          isDragging ? 'border-brand-light bg-brand-light/10' : 'border-slate-200 bg-[#F6F8FC] hover:border-brand-light/60'
        )}
      >
        <UploadCloud className="h-5 w-5 text-brand-light" />
        <p className="text-sm font-body text-slate-500">
          <span className="font-medium text-brand-dark">Click to upload</span> or drag and drop
        </p>
        {hint && <p className="text-[11px] font-body text-slate-400">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={ACCEPTED_FILE_EXTENSIONS}
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files || []))
            e.target.value = ''
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <FileIcon className="h-4 w-4 flex-shrink-0 text-brand-dark/50" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-body text-slate-600">{file.name}</p>
                <p className="text-[11px] font-body text-slate-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeAt(index)
                }}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
