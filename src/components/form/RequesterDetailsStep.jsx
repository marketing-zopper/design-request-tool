import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import FormField, { inputBaseClass } from '../ui/FormField'
import SelectField from '../ui/SelectField'
import Button from '../ui/Button'
import { requesterSchema } from '../../lib/validations'
import { TEAMS } from '../../lib/constants'
import { useStakeholders } from '../../hooks/useStakeholders'
import { Skeleton } from '../ui/LoadingState'

export default function RequesterDetailsStep({ defaultValues, onContinue }) {
  const { stakeholders, loading, error: stakeholdersError } = useStakeholders()
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(requesterSchema),
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stakeholderId = watch('stakeholderId')

  const submit = handleSubmit((values) => {
    const stakeholderName =
      values.stakeholderId === 'other'
        ? values.customStakeholderName
        : stakeholders.find((s) => s.id === values.stakeholderId)?.name
    onContinue({ ...values, stakeholderName })
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Team / Department" required error={errors.team?.message}>
          <SelectField placeholder="Select your team" {...register('team')}>
            {TEAMS.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField label="Work Email" required error={errors.requesterEmail?.message}>
          <input
            type="email"
            className={inputBaseClass}
            placeholder="you@company.com"
            {...register('requesterEmail')}
          />
        </FormField>
      </div>

      {loading ? (
        <Skeleton className="h-11 w-full" />
      ) : (
        <FormField label="Stakeholder / Approver" required error={errors.stakeholderId?.message}>
          <SelectField placeholder="Select a stakeholder" {...register('stakeholderId')}>
            {stakeholders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="other">Other (not listed)</option>
          </SelectField>
          {stakeholdersError && (
            <p className="text-[11px] font-body text-amber-600">
              Couldn't load the stakeholder list — choose "Other" and enter their details.
            </p>
          )}
        </FormField>
      )}

      {stakeholderId === 'other' && (
        <div className="grid gap-4 rounded-lg bg-brand-light/5 p-4 sm:grid-cols-2">
          <FormField label="Stakeholder Name" required error={errors.customStakeholderName?.message}>
            <input className={inputBaseClass} placeholder="Enter stakeholder name" {...register('customStakeholderName')} />
          </FormField>
          <FormField label="Stakeholder Email" required error={errors.customStakeholderEmail?.message}>
            <input
              type="email"
              className={inputBaseClass}
              placeholder="stakeholder@company.com"
              {...register('customStakeholderEmail')}
            />
          </FormField>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary">
          Continue
        </Button>
      </div>
    </form>
  )
}
