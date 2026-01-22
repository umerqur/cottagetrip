import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../lib/rooms'
import { getSupabase } from '../lib/supabase'
import { getProfile } from '../lib/profiles'
import AppShell from '../components/AppShell'
import Card from '../components/Card'
import PageShell from '../components/PageShell'

export default function CreateRoom() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
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

      // Check if user has a profile
      const { profile, error: profileError } = await getProfile(user.id)

      if (profileError) {
        setError(profileError)
        setIsCheckingAuth(false)
        return
      }

      if (!profile) {
        // Redirect to onboarding if no profile
        navigate('/onboarding?next=/create')
        return
      }

      setIsCheckingAuth(false)

      // Auto-create room once with both ref and state guards
      if (!hasCreatedRoom.current && !isCreating) {
        hasCreatedRoom.current = true
        setIsCreating(true)

        const { room, error: roomError } = await createRoom()

        if (roomError || !room) {
          setError(roomError || 'Failed to create room')
          // Reset both guards on error so user can retry
          hasCreatedRoom.current = false
          setIsCreating(false)
          return
        }

        // Navigate to the room page
        navigate(`/room/${room.code}`, { replace: true })
      }
    }

    checkAuthAndCreateRoom()
  }, [navigate])

  const retryCreate = async () => {
    // Prevent overlapping retry attempts
    if (isCreating) return

    // Reset error and guards
    setError(null)
    hasCreatedRoom.current = false
    setIsCreating(false)
    setIsCheckingAuth(true)

    // Re-run the auth check and create flow
    const checkAuthAndCreateRoom = async () => {
      const supabase = getSupabase()

      if (!supabase) {
        setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.')
        setIsCheckingAuth(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        navigate('/signin?next=/create')
        return
      }

      const { profile, error: profileError } = await getProfile(user.id)

      if (profileError) {
        setError(profileError)
        setIsCheckingAuth(false)
        return
      }

      if (!profile) {
        navigate('/onboarding?next=/create')
        return
      }

      setIsCheckingAuth(false)

      // Auto-create room once with both ref and state guards
      if (!hasCreatedRoom.current && !isCreating) {
        hasCreatedRoom.current = true
        setIsCreating(true)

        const { room, error: roomError } = await createRoom()

        if (roomError || !room) {
          setError(roomError || 'Failed to create room')
          // Reset both guards on error so user can retry
          hasCreatedRoom.current = false
          setIsCreating(false)
          return
        }

        // Navigate to the room page
        navigate(`/room/${room.code}`, { replace: true })
      }
    }

    checkAuthAndCreateRoom()
  }

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <AppShell>
        <PageShell maxWidth="sm" centerVertically>
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#2F241A] border-t-transparent"></div>
            </div>
            <h2 className="text-2xl font-bold text-[#2F241A]">Loading...</h2>
          </div>
        </PageShell>
      </AppShell>
    )
  }

  // Show Supabase configuration error
  if (error && error.includes('Supabase is not configured')) {
    return (
      <AppShell>
        <PageShell maxWidth="sm" centerVertically>
          <div className="mx-auto w-full max-w-md">
            <Card className="p-8">
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
              <h2 className="mb-4 text-center text-2xl font-bold text-[#2F241A]">
                Configuration Error
              </h2>
              <p className="mb-6 text-center text-base text-[#6B5C4D]">{error}</p>
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

  // Show error state if room creation failed
  if (error && !isCheckingAuth) {
    return (
      <AppShell>
        <PageShell maxWidth="sm" centerVertically>
          <div className="mx-auto w-full max-w-md">
            <Card className="p-8">
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
              <h2 className="mb-4 text-center text-2xl font-bold text-[#2F241A]">
                Failed to Create Room
              </h2>
              <p className="mb-6 text-center text-base text-[#6B5C4D]">{error}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={retryCreate}
                  disabled={isCreating}
                  className={`w-full rounded-lg px-8 py-3 text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isCreating
                      ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                      : 'bg-[#2F241A] text-white hover:bg-[#1F1812] focus:ring-[#2F241A]'
                  }`}
                >
                  {isCreating ? 'Creating...' : 'Try Again'}
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
          <h2 className="text-2xl font-bold text-[#2F241A]">Creating your room...</h2>
          <p className="mt-2 text-base text-[#6B5C4D]">
            Please wait while we set up your room
          </p>
        </div>
      </PageShell>
    </AppShell>
  )
}
