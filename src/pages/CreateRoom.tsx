import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../lib/rooms'
import { getSupabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

export default function CreateRoom() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const hasCreatedRoom = useRef(false)

  useEffect(() => {
    const checkAuthAndCreateRoom = async () => {
      const supabase = getSupabase()

      if (!supabase) {
        // Show Supabase configuration error
        setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.')
        setIsCheckingAuth(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to sign in with next parameter
        navigate('/signin?next=/create')
        return
      }

      setIsCheckingAuth(false)

      // Auto-create room once with ref guard
      if (!hasCreatedRoom.current) {
        hasCreatedRoom.current = true

        const { room, error: roomError } = await createRoom()

        if (roomError || !room) {
          setError(roomError || 'Failed to create room')
          hasCreatedRoom.current = false // Reset on error so user can retry
          return
        }

        // Navigate to the room page
        navigate(`/room/${room.code}`, { replace: true })
      }
    }

    checkAuthAndCreateRoom()
  }, [navigate])

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <AppShell>
        <main className="relative z-10 mx-auto max-w-[1200px] px-6">
          <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
            <div className="mx-auto w-full max-w-md text-center">
              <div className="mb-6 flex justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
              </div>
              <h2 className="text-2xl font-bold text-amber-900">Loading...</h2>
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  // Show Supabase configuration error in premium UI
  if (error && error.includes('Supabase is not configured')) {
    return (
      <AppShell>
        <main className="relative z-10 mx-auto max-w-[1200px] px-6">
          <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="rounded-2xl border border-amber-200/50 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
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
                <h2 className="mb-4 text-center text-2xl font-bold text-amber-900">
                  Configuration Error
                </h2>
                <p className="mb-6 text-center text-base text-amber-800">{error}</p>
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

  // Show error state if room creation failed
  if (error && !isCheckingAuth) {
    return (
      <AppShell>
        <main className="relative z-10 mx-auto max-w-[1200px] px-6">
          <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="rounded-2xl border border-amber-200/50 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
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
                <h2 className="mb-4 text-center text-2xl font-bold text-amber-900">
                  Failed to Create Room
                </h2>
                <p className="mb-6 text-center text-base text-amber-800">{error}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setError(null)
                      hasCreatedRoom.current = false
                      window.location.reload()
                    }}
                    className="w-full rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    Try Again
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
      </AppShell>
    )
  }

  return (
    <AppShell>
      <main className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
            </div>
            <h2 className="text-2xl font-bold text-amber-900">Creating your room...</h2>
            <p className="mt-2 text-base text-amber-800">
              Please wait while we set up your room
            </p>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
