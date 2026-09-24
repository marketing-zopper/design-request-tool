import ApprovalCard from './ApprovalCard'
import FinalDesignDownloadList from '../requests/FinalDesignDownloadList'
import { formatDate } from '../../lib/format'

function designTypeLabel(r) {
  return r.design_type === 'Other' ? r.custom_design_type || 'Other' : r.design_type
}

export default function CompletedRequestCard({ request, finalDesignAttachments }) {
  return (
    <ApprovalCard
      header={
        <div>
          <p className="font-heading text-sm font-semibold text-brand-dark">{request.request_code}</p>
          <p className="text-[13px] font-body text-slate-600">{designTypeLabel(request)}</p>
        </div>
      }
      meta={
        <>
          <p>
            <span className="text-slate-400">By </span>
            {request.requesterEmail}
          </p>
          <p>
            <span className="text-slate-400">Approved </span>
            {formatDate(request.updated_at)}
          </p>
        </>
      }
    >
      <FinalDesignDownloadList attachments={finalDesignAttachments} />
    </ApprovalCard>
  )
}
