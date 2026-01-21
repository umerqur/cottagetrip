import { ReactNode } from 'react'
import SiteHeader from './SiteHeader'

interface AppShellProps {
  children: ReactNode
  /** Optional right-side navigation element (defaults to UserMenu) */
  navRight?: ReactNode
}

export default function AppShell({
  children,
  navRight
}: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
      {/* Navigation */}
      <SiteHeader navRight={navRight} />

      {/* Main Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  )
}
