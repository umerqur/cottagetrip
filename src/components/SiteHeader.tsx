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
    <nav className="sticky top-0 z-50 isolate border-b border-[rgba(47,36,26,0.1)] bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          <h1
            className="flex-shrink-0 cursor-pointer font-semibold tracking-tight text-[#2F241A]"
            onClick={() => navigate('/')}
          >
            {/* Mobile: Show "Cottage" */}
            <span className="inline sm:hidden text-base">Cottage</span>
            {/* Desktop: Show full name */}
            <span className="hidden sm:inline text-xl">{APP_NAME}</span>
          </h1>
          {navRight !== undefined ? navRight : <UserMenu />}
        </div>
      </div>
    </nav>
  )
}
