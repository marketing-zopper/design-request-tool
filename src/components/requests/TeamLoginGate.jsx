import { useState } from 'react'
import { Lock } from 'lucide-react'
import Button from '../ui/Button'
import FormField, { inputBaseClass } from '../ui/FormField'
import SelectField from '../ui/SelectField'
import { MARKETING_TEAM } from '../../lib/teamAccess'

export default function TeamLoginGate({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const result = onLogin(email, password)
    setError(result.ok ? '' : result.error)
  }

  return (
    <div className="mx-auto mt-4 max-w-sm rounded-xl2 border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-dark/5">
          <Lock className="h-5 w-5 text-brand-dark/60" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-slate-800">Marketing Team Access</h2>
        <p className="text-sm font-body text-slate-500">Sign in to manage design requests.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <FormField label="You are" required>
          <SelectField placeholder="Select your name" value={email} onChange={(e) => setEmail(e.target.value)}>
            {MARKETING_TEAM.map((m) => (
              <option key={m.email} value={m.email}>
                {m.name}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField label="Password" required error={error}>
          <input
            type="password"
            className={inputBaseClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter team password"
            autoComplete="current-password"
          />
        </FormField>

        <Button type="submit" variant="primary" disabled={!email || !password}>
          Continue
        </Button>
      </form>
    </div>
  )
}
