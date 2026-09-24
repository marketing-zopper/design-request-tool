export default function ApprovalCard({ header, meta, children, footer }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">{header}</div>
      {meta && <div className="grid grid-cols-2 gap-y-1 text-[13px] font-body text-slate-500 sm:grid-cols-4">{meta}</div>}
      {children}
      {footer && <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-end">{footer}</div>}
    </div>
  )
}
