import { useNavigate, Link } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100">
      {/* Top bar */}
      <nav className="relative z-10 border-b border-amber-200/50 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-amber-900">Cottage Trip</h1>
            <Link
              to="/signin"
              className="text-sm text-amber-700 transition hover:text-amber-900"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
          <div className="mx-auto max-w-2xl text-center">
            {/* Headline */}
            <h2 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-amber-900 sm:text-6xl lg:text-7xl">
              Pick a cottage together.
            </h2>

            {/* Subheadline */}
            <p className="mb-10 text-xl text-amber-800 sm:text-2xl">
              Vote fast, plan tasks, then split costs.
            </p>

            {/* CTA Buttons */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/create')}
                className="rounded-lg bg-amber-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-amber-50"
              >
                Create a room
              </button>
              <button
                onClick={() => navigate('/join')}
                className="rounded-lg border-2 border-amber-600 bg-white/50 px-8 py-4 text-base font-semibold text-amber-900 backdrop-blur-sm transition hover:border-amber-700 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-amber-50"
              >
                Join a room
              </button>
            </div>

            {/* Privacy line */}
            <p className="text-sm text-amber-700">
              Rooms are private. Join with a room code.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
