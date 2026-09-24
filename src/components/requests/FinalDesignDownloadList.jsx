import { Download, FileCheck2 } from 'lucide-react'
import { getDownloadUrl } from '../../lib/uploads'

export default function FinalDesignDownloadList({ attachments }) {
  if (!attachments?.length) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {attachments.map((a) => (
        <li key={a.id}>
          <a
            href={getDownloadUrl(a.file_path, a.file_name)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-body text-slate-600 hover:border-brand-light/50 hover:bg-brand-light/5"
          >
            <FileCheck2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
            <span className="truncate">{a.file_name}</span>
            <span className="ml-auto flex flex-shrink-0 items-center gap-1 font-medium text-brand-dark">
              <Download className="h-3.5 w-3.5" /> Download
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
