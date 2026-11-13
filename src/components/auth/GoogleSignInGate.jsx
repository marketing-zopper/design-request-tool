import { useState } from 'react'
import { LogIn } from 'lucide-react'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.7 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.7 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 27 36 24 36c-5.3 0-9.6-3.1-11.3-7.4l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.6 5.6C39.7 37.8 44 31.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  )
}

export default function GoogleSignInGate({ title = 'Sign in to continue', description }) {
  const { signInWithGoogle } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const handleSignIn = async () => {
    setSubmitting(true)
    await signInWithGoogle()
    // No need to reset `submitting` — a successful call navigates away to Google.
  }

  return (
    <div className="mx-auto mt-4 max-w-sm rounded-xl2 border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark/5">
          <LogIn className="h-5 w-5 text-brand-dark/60" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-slate-800">{title}</h2>
        {description && <p className="text-sm font-body text-slate-500">{description}</p>}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-6 w-full"
        onClick={handleSignIn}
        loading={submitting}
        icon={!submitting && <GoogleGlyph />}
      >
        Sign in with Google
      </Button>
    </div>
  )
}
