export const DESIGN_TYPES = [
  'Standee',
  'Table Top',
  'Dangler',
  'Sticker',
  'Booklet',
  'Brochure',
  'Social Media Post',
  'Banner',
  'Emailer',
  'Presentation',
  'Digital Ad',
  'Print Ad',
  'Event Collateral',
  'Video / Motion',
  'Other',
]

export const TEAMS = [
  'Marketing',
  'Sales',
  'Category',
  'Business Development',
  'Product',
  'Operations',
  'Customer Success',
  'HR',
  'Finance',
  'Leadership',
  'Other',
]

// Internal status values, in workflow order.
export const STATUS = {
  PENDING_REQUIREMENT_APPROVAL: 'pending_requirement_approval',
  APPROVED: 'approved',
  IN_DESIGN: 'in_design',
  READY_FOR_REVIEW: 'ready_for_review',
  CHANGES_REQUESTED: 'changes_requested',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
}

export const STATUS_LABELS = {
  [STATUS.PENDING_REQUIREMENT_APPROVAL]: 'Awaiting Approval',
  [STATUS.APPROVED]: 'Approved',
  [STATUS.IN_DESIGN]: 'In Design',
  [STATUS.READY_FOR_REVIEW]: 'Ready for Review',
  [STATUS.CHANGES_REQUESTED]: 'Changes Requested',
  [STATUS.COMPLETED]: 'Completed',
  [STATUS.REJECTED]: 'Rejected',
}

// Tailwind-safe class groups per status pill.
export const STATUS_STYLES = {
  [STATUS.PENDING_REQUIREMENT_APPROVAL]: 'bg-amber-50 text-amber-700 border-amber-200',
  [STATUS.APPROVED]: 'bg-sky-50 text-sky-700 border-sky-200',
  [STATUS.IN_DESIGN]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  [STATUS.READY_FOR_REVIEW]: 'bg-violet-50 text-violet-700 border-violet-200',
  [STATUS.CHANGES_REQUESTED]: 'bg-orange-50 text-orange-700 border-orange-200',
  [STATUS.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [STATUS.REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200',
}

export const APPROVAL_TYPE = {
  REQUIREMENT: 'requirement',
  FINAL_DESIGN: 'final_design',
}

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes_requested',
}

export const ATTACHMENT_CATEGORY = {
  REFERENCE: 'reference',
  BRAND_ASSET: 'brand_asset',
  FINAL_DESIGN: 'final_design',
}

export const ACCEPTED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const ACCEPTED_FILE_EXTENSIONS =
  '.png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.ppt,.pptx,.doc,.docx'

export const MAX_FILE_SIZE_MB = 25
