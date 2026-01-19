import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../lib/rooms'

export default function CreateRoom() {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateRoom = async () => {
    setIsCreating(true)
    setError(null)

    const { room, error: roomError } = await createRoom()

    if (roomError || !room) {
      setError(roomError || 'Failed to create room')
      setIsCreating(false)
      return
    }

    // Navigate to the room page
    navigate(`/room/${room.code}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1000px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1
              className="cursor-pointer text-xl font-semibold text-gray-900"
              onClick={() => navigate('/')}
            >
              CottageVote
            </h1>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-[1000px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center py-12">
          <div className="w-full max-w-md">
            <h2 className="mb-8 text-center text-4xl font-bold text-gray-900">
              Create a room
            </h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className={`w-full rounded-lg px-8 py-3 text-base font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isCreating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {isCreating ? 'Creating room...' : 'Create room'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
