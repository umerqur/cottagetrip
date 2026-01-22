import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinRoomByCode } from '../lib/rooms'
import { getSupabase } from '../lib/supabase'
import { getProfile } from '../lib/profiles'
import AppShell from '../components/AppShell'
import Card from '../components/Card'
import TextInput from '../components/TextInput'
import PageShell from '../components/PageShell'

export default function JoinRoom() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
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
        navigate('/signin?next=/join')
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
        navigate('/onboarding?next=/join')
        return
      }

      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [navigate])

  const handleJoinRoom = async () => {
    if (roomCode.length < 4) return

    setIsJoining(true)
    setError(null)

    const { room, error: joinError } = await joinRoomByCode(roomCode)

    if (joinError || !room) {
      setError(joinError || 'Failed to join room')
      setIsJoining(false)
      return
    }

    // Navigate to the room page
    navigate(`/room/${room.code}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && roomCode.length >= 4 && !isJoining) {
      handleJoinRoom()
    }
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

  return (
    <AppShell>
      <PageShell maxWidth="sm" centerVertically>
        <div className="mx-auto w-full max-w-md">
          <Card className="p-8">
            <h2 className="mb-8 text-center text-3xl font-bold text-[#2F241A]">
              Join a room
            </h2>

            {error && !error.includes('Supabase is not configured') && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="mb-6">
              <TextInput
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.trim().toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Enter room code"
                disabled={isJoining}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={roomCode.length < 4 || isJoining}
              className={`w-full rounded-lg px-8 py-3 text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                roomCode.length < 4 || isJoining
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                  : 'bg-[#2F241A] text-white hover:bg-[#1F1812] focus:ring-[#2F241A]'
              }`}
            >
              {isJoining ? 'Joining...' : 'Continue'}
            </button>
          </Card>
        </div>
      </PageShell>
    </AppShell>
  )
}
