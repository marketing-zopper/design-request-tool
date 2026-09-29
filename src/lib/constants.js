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

export const TEAMS = ['Marketing', 'Sales', 'HR', 'Other']

// Options for the "All Requests" time-range filter — how far back (by
// created_at) the default list looks. Matches the 60-day retention window:
// nothing older than that exists to show anyway.
export const DAYS_FILTER_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 60 days' },
]

export const DEFAULT_DAYS_FILTER = 7

// Internal status values. Only 3 — whether a request needs a first-time
// design upload, is fully done, or needs a revision after a rejection is no
// longer its own status; it's inferred from whether a final_design
// attachment/approval exists yet (see hasFinalDesign in src/lib/api.js and
// StatusUpdatePanel).
export const STATUS = {
  AWAITED_APPROVAL: 'awaited_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const STATUS_LABELS = {
  [STATUS.AWAITED_APPROVAL]: 'Awaited Approval',
  [STATUS.APPROVED]: 'Approved',
  [STATUS.REJECTED]: 'Rejected',
}

// Tailwind-safe class groups per status pill.
export const STATUS_STYLES = {
  [STATUS.AWAITED_APPROVAL]: 'bg-amber-50 text-amber-700 border-amber-200',
  [STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
