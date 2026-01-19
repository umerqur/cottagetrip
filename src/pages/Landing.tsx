import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1000px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">CottageVote</h1>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="mx-auto max-w-[1000px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center py-12">
          <div className="w-full max-w-2xl text-center">
            {/* Headline */}
            <h2 className="mb-4 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Pick a cottage together.
            </h2>

            {/* Subtext */}
            <p className="mb-12 text-lg text-gray-600">
              Vote, plan tasks, then split costs.
            </p>

            {/* Buttons */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/create')}
                className="rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create a room
              </button>
              <button
                onClick={() => navigate('/join')}
                className="rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Join a room
              </button>
            </div>

            {/* Privacy line */}
            <p className="text-sm text-gray-500">
              Rooms are private. Join with a room code.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
