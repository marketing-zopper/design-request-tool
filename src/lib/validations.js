import { z } from 'zod'

export const requesterSchema = z
  .object({
    team: z.string().trim().min(1, 'Select your team'),
    requesterEmail: z.string().trim().email('Enter a valid work email'),
    stakeholderId: z.string().min(1, 'Select a stakeholder'),
    customStakeholderName: z.string().trim().optional().or(z.literal('')),
    customStakeholderEmail: z.string().trim().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.stakeholderId === 'other') {
      if (!data.customStakeholderName || data.customStakeholderName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customStakeholderName'],
          message: 'Enter the stakeholder name',
        })
      }
      if (
        !data.customStakeholderEmail ||
        !z.string().email().safeParse(data.customStakeholderEmail).success
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customStakeholderEmail'],
          message: 'Enter a valid stakeholder email',
        })
      }
    }
  })

export const designRequirementSchema = z
  .object({
    designType: z.string().min(1, 'Select a design type'),
    customDesignType: z.string().trim().optional().or(z.literal('')),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
    deadline: z.string().min(1, 'Select a required-by date'),
    dimensions: z.string().trim().optional().or(z.literal('')),
    coBranding: z.boolean().default(false),
    partnerName: z.string().trim().optional().or(z.literal('')),
    contentRequirement: z.string().trim().min(1, 'Describe the content requirement'),
    referenceLink: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((val) => !val || /^https?:\/\//i.test(val), 'Link must start with http:// or https://'),
    additionalNotes: z.string().trim().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.designType === 'Other' && (!data.customDesignType || data.customDesignType.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customDesignType'],
        message: 'Describe the design type',
      })
    }
    if (data.coBranding && (!data.partnerName || data.partnerName.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partnerName'],
        message: 'Enter the brand / partner name',
      })
    }
  })

export const approvalCommentSchema = z.object({
  comment: z.string().trim().optional().or(z.literal('')),
})

export const rejectCommentSchema = z.object({
  comment: z.string().trim().min(3, 'Add a short reason so the requester knows what to fix'),
})
