import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import Card from '../components/Card'
import TextInput from '../components/TextInput'
import PageShell from '../components/PageShell'

export default function SignIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
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

    setSending(true)
    setError(null)
    setSent(false)

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(nextUrl)}`
        }
      })

      if (signInError) {
        setError(signInError.message)
        setSending(false)
        return
      }

      // Show success message inline
      setSent(true)
      setSending(false)
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred')
      setSending(false)
    }
  }

  // Show Supabase configuration error
  if (!supabase) {
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
                Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.
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

  return (
    <AppShell>
      <PageShell maxWidth="sm" centerVertically>
        <div className="mx-auto w-full max-w-md">
          <Card className="p-8">
            <h2 className="mb-6 text-center text-3xl font-bold text-[#2F241A]">
              Sign in
            </h2>

            <p className="mb-6 text-center text-base text-[#6B5C4D]">
              Enter your email to receive a sign-in link
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {sent && (
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
                      We've sent a sign-in link to <strong>{email}</strong>. Click the link to sign in.
                    </p>
                    <p className="mt-2 text-sm text-green-600">
                      If you don't see the email within 1-2 minutes, please check your junk or spam folder.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSignIn}>
              <div className="mb-6">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={sending || sent}
                />
              </div>

              <button
                type="submit"
                disabled={sending || sent || !email}
                className={`w-full rounded-lg px-8 py-3 text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  sending || sent || !email
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                    : 'bg-[#2F241A] text-white hover:bg-[#1F1812] focus:ring-[#2F241A]'
                }`}
              >
                {sent ? 'Check your email' : sending ? 'Sending sign-in link...' : 'Send sign-in link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#6B5C4D]">
              No password needed. Just click the link we email you.
            </p>
          </Card>
        </div>
      </PageShell>
    </AppShell>
  )
}
