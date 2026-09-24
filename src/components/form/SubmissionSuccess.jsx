import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'

export default function SubmissionSuccess({ requestCodes, onSubmitAnother }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
      </div>
      <div>
        <h2 className="font-heading text-xl font-bold text-slate-800">Requests submitted successfully</h2>
        <p className="mt-1 font-body text-sm text-slate-500">
          {requestCodes.length} design request{requestCodes.length > 1 ? 's have' : ' has'} been created.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {requestCodes.map((code) => (
          <span
            key={code}
            className="rounded-full border border-brand-light/30 bg-brand-light/10 px-3.5 py-1.5 text-sm font-heading font-semibold text-brand-dark"
          >
            {code}
          </span>
        ))}
      </div>

      <div className="mt-2 flex gap-3">
        <Button variant="secondary" onClick={() => navigate('/requests')}>
          View Requests
        </Button>
        <Button variant="primary" onClick={onSubmitAnother}>
          Submit Another Request
        </Button>
      </div>
    </div>
  )
}
