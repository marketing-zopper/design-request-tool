import { ShieldAlert } from 'lucide-react'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

export default function NoAccessScreen() {
  const { email, signOut } = useAuth()

  return (
    <div className="mx-auto mt-4 max-w-sm rounded-xl2 border border-slate-200/80 bg-white p-6 text-center shadow-card sm:p-8">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
        <ShieldAlert className="h-5 w-5 text-amber-600" />
      </div>
      <h2 className="mt-2 font-heading text-lg font-semibold text-slate-800">You don&rsquo;t have access</h2>
      <p className="mt-1 text-sm font-body text-slate-500">
        {email && (
          <>
            Signed in as <span className="font-medium text-slate-700">{email}</span>.<br />
          </>
        )}
        If you believe this is a mistake, ask your Zopper Marketing Studio admin for an Editor or Admin role on the
        Design Request Tool.
      </p>
      <Button type="button" variant="ghost" className="mt-4" onClick={signOut}>
        Sign out
      </Button>
    </div>
  )
}
