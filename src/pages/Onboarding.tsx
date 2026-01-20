import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import { APP_NAME } from '../lib/brand'

export default function Onboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        navigate('/signin')
      }
    })
  }, [supabase, navigate])

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
          <div className="mx-auto w-full max-w-2xl">
            {/* Onboarding Card */}
            <div className="rounded-2xl border border-amber-200/50 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
              <h2 className="mb-6 text-center text-4xl font-bold text-amber-900">
                Welcome to {APP_NAME}!
              </h2>

              <p className="mb-8 text-center text-lg text-amber-800">
                Start planning your perfect cottage getaway with your group
              </p>

              {/* Features */}
              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-4 rounded-lg bg-amber-50/50 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">Create or Join a Room</h3>
                    <p className="text-sm text-amber-800">Share a room code with your group</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-lg bg-amber-50/50 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">Add Cottage Options</h3>
                    <p className="text-sm text-amber-800">Share Airbnb links with your group</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-lg bg-amber-50/50 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">Vote Together</h3>
                    <p className="text-sm text-amber-800">Decide on the perfect cottage as a team</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => navigate('/create')}
                  className="rounded-lg bg-amber-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                >
                  Create a Room
                </button>
                <button
                  onClick={() => navigate('/join')}
                  className="rounded-lg border-2 border-amber-600 bg-white/50 px-8 py-3 text-base font-semibold text-amber-900 backdrop-blur-sm transition hover:border-amber-700 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                >
                  Join a Room
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
