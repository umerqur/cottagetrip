import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_NAME } from '../lib/brand'
import UserMenu from './UserMenu'

interface AppShellProps {
  children: ReactNode
  /** Use gradient background like landing page (default: true) */
  gradientBackground?: boolean
  /** Optional right-side navigation element (defaults to UserMenu) */
  navRight?: ReactNode
}

export default function AppShell({
  children,
  gradientBackground = true,
  navRight
}: AppShellProps) {
  const navigate = useNavigate()

  return (
    <div className={`relative min-h-screen overflow-hidden ${
      gradientBackground
        ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100'
        : 'bg-gray-50'
    }`}>
      {/* Navigation */}
      <nav className={`relative z-40 overflow-visible border-b ${
        gradientBackground
          ? 'border-amber-200/50 bg-white/40 backdrop-blur-xl'
          : 'border-gray-200 bg-white'
      }`}>
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1
              className={`cursor-pointer text-xl font-semibold ${
                gradientBackground
                  ? 'tracking-tight text-amber-900'
                  : 'text-gray-900'
              }`}
              onClick={() => navigate('/')}
            >
              {APP_NAME}
            </h1>
            {navRight !== undefined ? navRight : <UserMenu />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {children}
    </div>
  )
}
