import clsx from 'clsx'

export default function PageContainer({ children, className, wide = false }) {
  return (
    <main className={clsx('mx-auto w-full px-4 py-8 sm:px-6 lg:px-8', wide ? 'max-w-6xl' : 'max-w-[1100px]', className)}>
      {children}
    </main>
  )
}
