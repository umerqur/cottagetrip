import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import Card from '../components/Card'
import PageShell from '../components/PageShell'

export default function Auth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const nextUrl = searchParams.get('next') || '/'

  const supabase = getSupabase()

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.')
      return
    }

    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        const { data, error: authError } = await supabase.auth.getSession()

        if (authError) {
          console.error('Auth error:', authError)
          setError(authError.message)
          return
        }

        if (data.session) {
          // Successfully authenticated, redirect to next URL
          navigate(nextUrl, { replace: true })
        } else {
          setError('No session found. Please try signing in again.')
        }
      } catch (err) {
        console.error('Unexpected auth error:', err)
        setError('An unexpected error occurred')
      }
    }

    handleAuthCallback()
  }, [supabase, navigate, nextUrl])

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
                Authentication Error
              </h2>

              {/* Error Message */}
              <p className="mb-6 text-center text-base text-[#6B5C4D]">
                {error || 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/signin')}
                  className="w-full rounded-lg bg-[#2F241A] px-8 py-3 text-base font-semibold text-white transition hover:bg-[#1F1812] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
                >
                  Try signing in again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full rounded-lg border-2 border-[#2F241A] bg-transparent px-8 py-3 text-base font-semibold text-[#2F241A] transition hover:bg-[rgba(47,36,26,0.05)] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
                >
                  Go to Home
                </button>
              </div>
            </Card>
          </div>
        </PageShell>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageShell maxWidth="sm" centerVertically>
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#2F241A] border-t-transparent"></div>
          </div>
          <h2 className="text-2xl font-bold text-[#2F241A]">
            Authenticating...
          </h2>
          <p className="mt-2 text-base text-[#6B5C4D]">
            Please wait while we sign you in
          </p>
        </div>
      </PageShell>
    </AppShell>
  )
}
