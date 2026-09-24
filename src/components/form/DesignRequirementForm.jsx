import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import FormField, { inputBaseClass } from '../ui/FormField'
import SelectField from '../ui/SelectField'
import TextareaField from '../ui/TextareaField'
import Button from '../ui/Button'
import FileUploader from './FileUploader'
import { designRequirementSchema } from '../../lib/validations'
import { DESIGN_TYPES } from '../../lib/constants'

export default function DesignRequirementForm({
  requirement,
  index,
  referenceFiles,
  brandAssetFiles,
  onReferenceFilesChange,
  onBrandAssetFilesChange,
  onSave,
  onCancel,
  canCancel,
}) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(designRequirementSchema),
    defaultValues: {
      designType: requirement.designType,
      customDesignType: requirement.customDesignType,
      quantity: requirement.quantity || 1,
      deadline: requirement.deadline,
      dimensions: requirement.dimensions,
      coBranding: requirement.coBranding,
      partnerName: requirement.partnerName,
      contentRequirement: requirement.contentRequirement,
      referenceLink: requirement.referenceLink,
      additionalNotes: requirement.additionalNotes,
    },
  })

  const designType = watch('designType')
  const coBranding = watch('coBranding')

  const submit = handleSubmit((values) => {
    onSave(values)
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="font-heading text-[15px] font-semibold text-slate-700">
          Design Request {String(index + 1).padStart(2, '0')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Design Type" required error={errors.designType?.message}>
          <SelectField placeholder="Select design type" {...register('designType')}>
            {DESIGN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectField>
        </FormField>

        {designType === 'Other' && (
          <FormField label="Describe the design type" required error={errors.customDesignType?.message}>
            <input className={inputBaseClass} placeholder="e.g. Retail shelf wobbler" {...register('customDesignType')} />
          </FormField>
        )}

        <FormField label="Quantity" required error={errors.quantity?.message}>
          <input type="number" min={1} className={inputBaseClass} {...register('quantity')} />
        </FormField>

        <FormField label="Required By" required error={errors.deadline?.message}>
          <input type="date" className={inputBaseClass} {...register('deadline')} />
        </FormField>

        <FormField label="Dimensions / Size" hint="e.g. 2.5 ft × 6 ft" error={errors.dimensions?.message}>
          <input className={inputBaseClass} placeholder="e.g. 2.5 ft × 6 ft" {...register('dimensions')} />
        </FormField>
      </div>

      <FormField label="Co-branding Required?">
        <Controller
          control={control}
          name="coBranding"
          render={({ field }) => (
            <div className="flex gap-2">
              {[
                { label: 'No', value: false },
                { label: 'Yes', value: true },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => field.onChange(opt.value)}
                  className={clsx(
                    'h-10 flex-1 rounded-lg border text-sm font-body font-medium transition-colors sm:flex-none sm:w-24',
                    field.value === opt.value
                      ? 'border-brand-light bg-brand-light/10 text-brand-dark'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-brand-light/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        />
      </FormField>

      {coBranding && (
        <div className="grid gap-4 rounded-lg bg-brand-light/5 p-4 sm:grid-cols-2">
          <FormField label="Brand / Partner Name" required error={errors.partnerName?.message}>
            <input className={inputBaseClass} placeholder="e.g. Acme Corp" {...register('partnerName')} />
          </FormField>
          <FormField label="Logo / Brand Assets">
            <FileUploader
              files={brandAssetFiles}
              onChange={onBrandAssetFilesChange}
              hint="Images, PDF, PPT or DOC — up to 25MB each"
            />
          </FormField>
        </div>
      )}

      <FormField label="Content Requirement" required error={errors.contentRequirement?.message}>
        <TextareaField
          rows={4}
          placeholder="Add the exact copy/content or explain what needs to be communicated..."
          {...register('contentRequirement')}
        />
      </FormField>

      <FormField label="References">
        <FileUploader
          files={referenceFiles}
          onChange={onReferenceFilesChange}
          hint="Images, PDF, PPT or DOC — up to 25MB each"
        />
      </FormField>

      <FormField label="Reference Link" error={errors.referenceLink?.message}>
        <input
          className={inputBaseClass}
          placeholder="Paste Figma / Drive / ChatGPT / existing creative link"
          {...register('referenceLink')}
        />
      </FormField>

      <FormField label="Additional Notes" error={errors.additionalNotes?.message}>
        <TextareaField rows={3} placeholder="Anything else the design team should know..." {...register('additionalNotes')} />
      </FormField>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {canCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm">
          Save Request
        </Button>
      </div>
    </form>
  )
}
