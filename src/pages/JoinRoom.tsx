import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinRoomByCode } from '../lib/rooms'
import { getSupabase } from '../lib/supabase'

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
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
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
      </div>
    )
  }

  // Show Supabase configuration error in premium UI
  if (error && error.includes('Supabase is not configured')) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
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
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
      {/* Navigation */}
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

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-amber-200/50 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
              <h2 className="mb-8 text-center text-3xl font-bold text-amber-900">
                Join a room
              </h2>

              {error && !error.includes('Supabase is not configured') && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.trim().toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter room code"
                  disabled={isJoining}
                  className="w-full rounded-lg border border-amber-300 bg-white/50 px-4 py-3 text-base text-amber-900 placeholder-amber-600 backdrop-blur-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={roomCode.length < 4 || isJoining}
                className={`w-full rounded-lg px-8 py-3 text-base font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                  roomCode.length < 4 || isJoining
                    ? 'cursor-not-allowed bg-amber-400'
                    : 'bg-amber-600 shadow-amber-500/30 hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40'
                }`}
              >
                {isJoining ? 'Joining...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
