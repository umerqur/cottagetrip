import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import SurfaceCard from '../components/SurfaceCard'
import Input from '../components/Input'
import Button from '../components/Button'
import { getSession, signOut } from '../lib/auth'

export default function JoinRoom() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getSession()
        if (!session) {
          navigate('/signin?next=/join', { replace: true })
        } else {
          setIsAuthenticated(true)
        }
      } catch {
        navigate('/signin?next=/join', { replace: true })
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [navigate])

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  const handleContinue = () => {
    // Room join logic will be implemented here later
    console.log('Join room with code:', roomCode)
  }

  if (loading || !isAuthenticated) {
    return null
  }

  return (
    <PageShell showAuth onSignOut={handleSignOut}>
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center py-12">
          <div className="w-full max-w-md">
            <SurfaceCard>
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold text-white">Join a room</h1>
                  <p className="text-slate-300">Enter your room code to continue</p>
                </div>

                <Input
                  type="text"
                  label="Room code"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.trim().toUpperCase())}
                  autoFocus
                  helperText="Room codes are case-insensitive and at least 4 characters"
                />

                <Button
                  onClick={handleContinue}
                  disabled={roomCode.length < 4}
                  fullWidth
                >
                  Continue
                </Button>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
