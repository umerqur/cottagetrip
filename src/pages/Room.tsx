import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRoomByCode } from '../lib/rooms'
import type { Room as RoomType } from '../lib/supabase'

export default function Room() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const [room, setRoom] = useState<RoomType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!code) {
      setError('No room code provided')
      setLoading(false)
      return
    }

    loadRoom()
  }, [code])

  const loadRoom = async () => {
    if (!code) return

    setLoading(true)
    setError(null)

    const { room: roomData, error: roomError } = await getRoomByCode(code)

    if (roomError || !roomData) {
      setError(roomError || 'Room not found')
      setLoading(false)
      return
    }

    setRoom(roomData)
    setLoading(false)
  }

  const handleCopyCode = async () => {
    if (!room) return

    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-4">
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
        <main className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading room...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-4">
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
        <main className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-5xl">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Room not found</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition"
              >
                Go home
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
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
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        {/* Room Code Section */}
        <div className="mb-8 flex items-center justify-between rounded-lg bg-white px-6 py-4 shadow-sm border border-gray-200">
          <div>
            <p className="text-sm text-gray-600 mb-1">Room Code</p>
            <p className="text-2xl font-bold text-gray-900 tracking-wider">{room.code}</p>
          </div>
          <button
            onClick={handleCopyCode}
            className={`rounded-lg px-5 py-2.5 font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              copied
                ? 'bg-green-600 text-white focus:ring-green-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy code'}
          </button>
        </div>

        {/* Empty State Sections */}
        <div className="space-y-6">
          {/* Cottages Section */}
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Cottages</h2>
            </div>
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl">🏡</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cottages yet</h3>
              <p className="text-gray-600 mb-6">Start adding cottages to vote on your favorite getaway spots.</p>
              <button className="rounded-lg bg-blue-600 px-6 py-2.5 text-white font-medium hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Add cottage
              </button>
            </div>
          </div>

          {/* Votes Section */}
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Votes</h2>
            </div>
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl">🗳️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No votes yet</h3>
              <p className="text-gray-600 mb-6">Cast your votes to help the group decide on the perfect cottage.</p>
              <button className="rounded-lg bg-purple-600 px-6 py-2.5 text-white font-medium hover:bg-purple-700 transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                Start voting
              </button>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
            </div>
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl">✓</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
              <p className="text-gray-600 mb-6">Create tasks to organize your trip planning and preparation.</p>
              <button className="rounded-lg bg-green-600 px-6 py-2.5 text-white font-medium hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                Add task
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
