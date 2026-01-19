import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function JoinRoom() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')

  const handleContinue = () => {
    // Room join logic will be implemented here later
    console.log('Join room with code:', roomCode)
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
              Join a room
            </h2>

            <div className="mb-6">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.trim().toUpperCase())}
                placeholder="Enter room code"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleContinue}
              disabled={roomCode.length < 4}
              className={`w-full rounded-lg px-8 py-3 text-base font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                roomCode.length < 4
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
