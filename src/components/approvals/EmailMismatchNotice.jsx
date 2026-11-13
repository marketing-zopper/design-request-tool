import { AlertTriangle } from 'lucide-react'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

/**
 * Shown when record_stakeholder_approval() rejects a write with
 * 'email_mismatch' — the signed-in Google account isn't the one this
 * request's invitation named. Most commonly: someone forwarded the
 * approval email to a colleague.
 */
export default function EmailMismatchNotice({ invitedEmail, currentEmail }) {
  const { signOut, signInWithGoogle } = useAuth()

  const handleSwitch = async () => {
    await signOut()
    await signInWithGoogle()
  }

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] font-body text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div className="flex flex-col gap-2">
        <p>
          This approval link was sent to <span className="font-semibold">{invitedEmail || 'a different email'}</span>.
          You&rsquo;re signed in as <span className="font-semibold">{currentEmail}</span>, which doesn&rsquo;t match. If
          this request is yours, sign in with the Google account that received the original email. If someone
          forwarded this to you, ask them to approve it themselves.
        </p>
        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={handleSwitch}>
          Switch Google account
        </Button>
      </div>
    </div>
  )
}
