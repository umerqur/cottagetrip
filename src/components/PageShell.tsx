import { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  /** Max width constraint - defaults to 1200px */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  /** Center content vertically */
  centerVertically?: boolean
}

/**
 * PageShell component for consistent page layouts
 * Provides max-width container and consistent horizontal padding
 */
export default function PageShell({
  children,
  maxWidth = 'lg',
  centerVertically = false,
}: PageShellProps) {
  const maxWidthClasses = {
    sm: 'max-w-md',    // 448px
    md: 'max-w-2xl',   // 672px
    lg: 'max-w-[1200px]', // 1200px (default)
    xl: 'max-w-6xl',   // 1152px
  }

  return (
    <main className={`relative z-10 mx-auto ${maxWidthClasses[maxWidth]} px-8`}>
      <div className={centerVertically ? 'flex min-h-[calc(100vh-73px)] items-center py-12' : 'py-12'}>
        {children}
      </div>
    </main>
  )
}
