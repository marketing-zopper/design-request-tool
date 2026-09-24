import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { UploadCloud, FileCheck2, Loader2 } from 'lucide-react'
import Button from '../ui/Button'
import { validateFile } from '../../lib/uploads'
import { uploadFinalDesign, updateRequestStatus } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { STATUS, ACCEPTED_FILE_EXTENSIONS } from '../../lib/constants'
import { formatFileSize } from '../../lib/format'

export default function StatusUpdatePanel({ request, finalDesignAttachments, onUpdated }) {
  const inputRef = useRef(null)
  const [pendingFiles, setPendingFiles] = useState([]) // [{file, status: 'uploading'|'done'|'error'}]
  const [changingStatus, setChangingStatus] = useState(false)

  const hasFinalDesign = finalDesignAttachments.length > 0

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList)
    const valid = []
    for (const file of files) {
      const error = validateFile(file)
      if (error) toast.error(error)
      else valid.push(file)
    }
    if (!valid.length) return

    setPendingFiles(valid.map((file) => ({ file, status: 'uploading' })))
    try {
      await uploadFinalDesign(request.request_code, request.id, valid)
      setPendingFiles(valid.map((file) => ({ file, status: 'done' })))
      toast.success('Design uploaded')
      onUpdated()
    } catch (err) {
      setPendingFiles(valid.map((file) => ({ file, status: 'error' })))
      toast.error(getErrorMessage(err, 'Upload failed'))
    }
  }

  const changeStatus = async (status, successMessage) => {
    setChangingStatus(true)
    try {
      await updateRequestStatus(request.id, status)
      toast.success(successMessage)
      onUpdated()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update status'))
    } finally {
      setChangingStatus(false)
    }
  }

  if (request.status === STATUS.APPROVED) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-body text-slate-500">Requirement approved — ready for the design team to start.</p>
        <Button variant="primary" size="sm" onClick={() => changeStatus(STATUS.IN_DESIGN, 'Moved to In Design')} loading={changingStatus}>
          Move to In Design
        </Button>
      </div>
    )
  }

  if (request.status === STATUS.CHANGES_REQUESTED) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-body text-slate-500">The stakeholder requested changes. Move back to In Design to continue.</p>
        <Button variant="primary" size="sm" onClick={() => changeStatus(STATUS.IN_DESIGN, 'Moved to In Design')} loading={changingStatus}>
          Move to In Design
        </Button>
      </div>
    )
  }

  if (request.status === STATUS.IN_DESIGN) {
    return (
      <div className="flex flex-col gap-3">
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand-light/50 bg-brand-light/5 px-4 py-5 text-center hover:bg-brand-light/10"
        >
          <UploadCloud className="h-5 w-5 text-brand-light" />
          <p className="text-sm font-body text-slate-500">
            <span className="font-medium text-brand-dark">{hasFinalDesign ? 'Upload New Version' : 'Upload Design'}</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_EXTENSIONS}
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {pendingFiles.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {pendingFiles.map(({ file, status }, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-body text-slate-600">
                {status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-light" />}
                {status === 'done' && <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" />}
                <span className="truncate">{file.name}</span>
                <span className="ml-auto text-[11px] text-slate-400">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
        )}

        {!hasFinalDesign && (
          <p className="text-[11px] font-body text-slate-400">
            Upload the design output before marking this request ready for review.
          </p>
        )}

        <Button
          variant="primary"
          size="sm"
          disabled={!hasFinalDesign}
          onClick={() => changeStatus(STATUS.READY_FOR_REVIEW, 'Marked as Ready for Review')}
          loading={changingStatus}
        >
          Mark Ready for Review
        </Button>
      </div>
    )
  }

  return null
}
