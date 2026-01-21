import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_NAME } from '../lib/brand'
import UserMenu from './UserMenu'

interface SiteHeaderProps {
  /** Optional right-side navigation element (defaults to UserMenu) */
  navRight?: ReactNode
}

export default function SiteHeader({ navRight }: SiteHeaderProps) {
  const navigate = useNavigate()

  return (
    <nav className="relative z-50 isolate border-b border-amber-200/50 bg-white/40 backdrop-blur-xl">
      <div className="mx-auto max-w-[1200px] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1
            className="cursor-pointer text-xl font-semibold tracking-tight text-amber-900"
            onClick={() => navigate('/')}
          >
            {APP_NAME}
          </h1>
          {navRight !== undefined ? navRight : <UserMenu />}
        </div>
      </div>
    </nav>
  )
}
