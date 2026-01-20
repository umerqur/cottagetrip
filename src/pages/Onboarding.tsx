import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import { upsertProfile } from '../lib/profiles'
import AppShell from '../components/AppShell'
import { APP_NAME } from '../lib/brand'

export default function Onboarding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const supabase = getSupabase()

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.')
      setLoading(false)
      return
    }

    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoading(false)
      if (!user) {
        const next = searchParams.get('next') || '/'
        navigate(`/signin?next=${encodeURIComponent(`/onboarding?next=${next}`)}`)
      } else {
        setUserId(user.id)
        setUserEmail(user.email || '')
      }
    })
  }, [supabase, navigate, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    if (!userId || !userEmail) {
      setError('User information not available')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const { error: upsertError } = await upsertProfile(userId, userEmail, displayName.trim())

    if (upsertError) {
      setError(upsertError)
      setIsSubmitting(false)
      return
    }

    // Navigate to next page or home
    const next = searchParams.get('next') || '/'
    navigate(next, { replace: true })
  }

  if (!supabase || error) {
    return (
      <AppShell>
        {/* Error Content */}
        <main className="relative z-10 mx-auto max-w-[1200px] px-6">
          <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
            <div className="mx-auto w-full max-w-md">
              {/* Error Card */}
              <div className="rounded-2xl border border-amber-200/50 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
                {/* Error Icon */}
                <div className="mb-6 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <svg
                      className="h-8 w-8 text-red-600"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                {/* Error Title */}
                <h2 className="mb-4 text-center text-2xl font-bold text-amber-900">
                  Configuration Error
                </h2>

                {/* Error Message */}
                <p className="mb-6 text-center text-base text-amber-800">
                  {error || 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'}
                </p>

                {/* Action Button */}
                <button
                  onClick={() => navigate('/')}
                  className="w-full rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        {/* Loading Content */}
        <main className="relative z-10 mx-auto max-w-[1200px] px-6">
          <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
            <div className="mx-auto w-full max-w-md text-center">
              <div className="mb-6 flex justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
              </div>
              <h2 className="text-2xl font-bold text-amber-900">
                Loading...
              </h2>
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {/* Onboarding Content */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
          <div className="mx-auto w-full max-w-md">
            {/* Onboarding Card */}
            <div className="rounded-2xl border border-amber-200/50 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
              <h2 className="mb-6 text-center text-3xl font-bold text-amber-900">
                Welcome to {APP_NAME}!
              </h2>

              <p className="mb-8 text-center text-base text-amber-800">
                Let's get you set up with a display name
              </p>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <div className="mb-6">
                  <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-amber-900">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-amber-300 bg-white/50 px-4 py-3 text-base text-amber-900 placeholder-amber-600 backdrop-blur-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={!displayName.trim() || isSubmitting}
                  className={`w-full rounded-lg px-8 py-3 text-base font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                    !displayName.trim() || isSubmitting
                      ? 'cursor-not-allowed bg-amber-400'
                      : 'bg-amber-600 shadow-amber-500/30 hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Continue'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
