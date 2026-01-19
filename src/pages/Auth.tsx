import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

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
          navigate(nextUrl)
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
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
        {/* Top bar */}
        <nav className="relative z-10 border-b border-amber-200/50 bg-white/40 backdrop-blur-xl">
          <div className="mx-auto max-w-[1200px] px-6 py-4">
            <div className="flex items-center justify-between">
              <h1
                className="cursor-pointer text-xl font-semibold tracking-tight text-amber-900"
                onClick={() => navigate('/')}
              >
                Cottage Trip
              </h1>
            </div>
          </div>
        </nav>

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
                  Authentication Error
                </h2>

                {/* Error Message */}
                <p className="mb-6 text-center text-base text-amber-800">
                  {error || 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/signin')}
                    className="w-full rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    Try signing in again
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full rounded-lg border-2 border-amber-600 bg-white/50 px-6 py-3 text-base font-semibold text-amber-900 backdrop-blur-sm transition hover:border-amber-700 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
      {/* Top bar */}
      <nav className="relative z-10 border-b border-amber-200/50 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-amber-900">
              Cottage Trip
            </h1>
          </div>
        </div>
      </nav>

      {/* Loading Content */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
            </div>
            <h2 className="text-2xl font-bold text-amber-900">
              Authenticating...
            </h2>
            <p className="mt-2 text-base text-amber-800">
              Please wait while we sign you in
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
