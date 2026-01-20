import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

export default function SignIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const nextUrl = searchParams.get('next') || '/'

  const supabase = getSupabase()

  useEffect(() => {
    // Check if user is already authenticated
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          navigate(nextUrl)
        }
      })
    }
  }, [supabase, navigate, nextUrl])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(nextUrl)}`
        }
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // Show success message inline
      setSuccess(true)
      setLoading(false)
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  // Show Supabase configuration error in premium UI
  if (!supabase) {
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
                  Configuration Error
                </h2>

                {/* Error Message */}
                <p className="mb-6 text-center text-base text-amber-800">
                  Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.
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
      </div>
    )
  }

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

      {/* Sign In Form */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
          <div className="mx-auto w-full max-w-md">
            {/* Form Card */}
            <div className="rounded-2xl border border-amber-200/50 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
              <h2 className="mb-6 text-center text-3xl font-bold text-amber-900">
                Sign in
              </h2>

              <p className="mb-6 text-center text-base text-amber-800">
                Enter your email to receive a magic link
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-600"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-green-800">
                        Check your email!
                      </h3>
                      <p className="mt-1 text-sm text-green-700">
                        We've sent a magic link to <strong>{email}</strong>. Click the link to sign in.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignIn}>
                <div className="mb-6">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                    className="w-full rounded-lg border border-amber-300 bg-white/50 px-4 py-3 text-base text-amber-900 placeholder-amber-600 backdrop-blur-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className={`w-full rounded-lg px-6 py-3 text-base font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                    loading || !email
                      ? 'cursor-not-allowed bg-amber-400'
                      : 'bg-amber-600 shadow-amber-500/30 hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40'
                  }`}
                >
                  {loading ? 'Sending magic link...' : 'Send magic link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-amber-700">
                No password needed. Just click the link we email you.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
