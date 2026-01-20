import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import { getProfile, type Profile } from '../lib/profiles'

export default function UserMenu() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const supabase = getSupabase()

  useEffect(() => {
    if (!supabase) return

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ id: user.id, email: user.email || '' })

        // Get profile
        getProfile(user.id).then(({ profile }) => {
          setProfile(profile)
        })
      }
    })
  }, [supabase])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    if (!supabase) return

    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsOpen(false)
    navigate('/')
  }

  // If not logged in, show Sign in link
  if (!user || !profile) {
    return (
      <a
        href="/signin"
        className="text-sm text-amber-700 transition hover:text-amber-900"
      >
        Sign in
      </a>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Display Name Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-900 transition hover:bg-amber-100/50"
      >
        <span className="font-medium">{profile.display_name}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-amber-200 bg-white shadow-lg">
          <div className="border-b border-amber-200 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">{profile.display_name}</p>
            <p className="mt-1 text-xs text-gray-500">{user.email}</p>
          </div>
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-amber-900 transition hover:bg-amber-50"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
