import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import { upsertProfile } from '../lib/profiles'
import AppShell from '../components/AppShell'
import Card from '../components/Card'
import TextInput from '../components/TextInput'
import PageShell from '../components/PageShell'
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
        <PageShell maxWidth="sm" centerVertically>
          <div className="mx-auto w-full max-w-md">
            <Card className="p-8">
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
              <h2 className="mb-4 text-center text-2xl font-bold text-[#2F241A]">
                Configuration Error
              </h2>

              {/* Error Message */}
              <p className="mb-6 text-center text-base text-[#6B5C4D]">
                {error || 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'}
              </p>

              {/* Action Button */}
              <button
                onClick={() => navigate('/')}
                className="w-full rounded-lg bg-[#2F241A] px-8 py-3 text-base font-semibold text-white transition hover:bg-[#1F1812] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
              >
                Go to Home
              </button>
            </Card>
          </div>
        </PageShell>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <PageShell maxWidth="sm" centerVertically>
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#2F241A] border-t-transparent"></div>
            </div>
            <h2 className="text-2xl font-bold text-[#2F241A]">
              Loading...
            </h2>
          </div>
        </PageShell>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageShell maxWidth="sm" centerVertically>
        <div className="mx-auto w-full max-w-md">
          <Card className="p-8">
            <h2 className="mb-6 text-center text-3xl font-bold text-[#2F241A]">
              Welcome to {APP_NAME}!
            </h2>

            <p className="mb-8 text-center text-base text-[#6B5C4D]">
              Let's get you set up with a display name
            </p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <TextInput
                  type="text"
                  id="displayName"
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!displayName.trim() || isSubmitting}
                className={`w-full rounded-lg px-8 py-3 text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  !displayName.trim() || isSubmitting
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                    : 'bg-[#2F241A] text-white hover:bg-[#1F1812] focus:ring-[#2F241A]'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Continue'}
              </button>
            </form>
          </Card>
        </div>
      </PageShell>
    </AppShell>
  )
}
