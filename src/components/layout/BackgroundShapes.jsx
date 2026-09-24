// Subtle abstract geometric shapes for the outer page background, echoing the
// rounded blobs in the form UI reference — kept low-opacity and fixed so they
// never interfere with content or cause scroll/overflow issues.
export default function BackgroundShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-orange/15 blur-2xl sm:h-96 sm:w-96" />
      <div className="absolute -left-20 top-1/3 h-56 w-56 rounded-full bg-brand-light/15 blur-3xl" />
      <div className="absolute bottom-[-6rem] right-1/4 h-64 w-64 rounded-full bg-brand-dark/10 blur-3xl" />
      <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-brand-light/10 blur-2xl" />
    </div>
  )
}
