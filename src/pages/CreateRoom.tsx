import { useNavigate } from 'react-router-dom'

export default function CreateRoom() {
  const navigate = useNavigate()

  const handleContinue = () => {
    // Room creation logic will be implemented here later
    console.log('Create room')
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

            <p className="mb-4 text-center text-sm text-gray-600">
              Room creation is coming next.
            </p>

            <button
              onClick={handleContinue}
              disabled
              className="w-full rounded-lg bg-gray-400 px-8 py-3 text-base font-medium text-white cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
