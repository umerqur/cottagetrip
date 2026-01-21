import { ReactNode } from 'react'
import SiteHeader from './SiteHeader'

interface AppShellProps {
  children: ReactNode
  /** Optional right-side navigation element (defaults to UserMenu) */
  navRight?: ReactNode
  /** Background variant - 'gradient' (default) or 'white' */
  background?: 'gradient' | 'white'
}

export default function AppShell({
  children,
  navRight,
  background = 'gradient'
}: AppShellProps) {
  const bgClass = background === 'white'
    ? 'bg-white'
    : 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100'

  return (
    <div className={`relative min-h-screen overflow-hidden ${bgClass}`}>
      {/* Navigation */}
      <SiteHeader navRight={navRight} />

      {/* Main Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  )
}
