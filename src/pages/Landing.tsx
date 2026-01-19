import { useNavigate, Link } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Subtle radial glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>

      {/* Top bar */}
      <nav className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-white">Cottage Trip</h1>
            <Link
              to="/signin"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center py-12">
          <div className="grid w-full gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column */}
            <div className="flex flex-col justify-center">
              {/* Headline */}
              <h2 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
                Pick a cottage together.
              </h2>

              {/* Subheadline */}
              <p className="mb-8 text-xl text-slate-300 sm:text-2xl">
                Vote fast, plan tasks, then split costs.
              </p>

              {/* Bullet points */}
              <ul className="mb-10 space-y-3">
                <li className="flex items-center gap-3 text-base text-slate-300">
                  <svg className="h-5 w-5 flex-shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Private rooms by code
                </li>
                <li className="flex items-center gap-3 text-base text-slate-300">
                  <svg className="h-5 w-5 flex-shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Decision locks after the winner
                </li>
              </ul>

              {/* CTA Buttons */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() => navigate('/create')}
                  className="rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/50 transition hover:shadow-xl hover:shadow-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Create a room
                </button>
                <button
                  onClick={() => navigate('/join')}
                  className="rounded-lg border-2 border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Join a room
                </button>
              </div>

              {/* Privacy line */}
              <p className="text-sm text-slate-400">
                Rooms are private. Join with a room code.
              </p>
            </div>

            {/* Right Column - Decorative Card */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                {/* Card content - decorative UI mock */}
                <div className="space-y-6">
                  {/* Row 1: Listings compared */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">3 listings compared</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
                      <div className="h-2 w-1/4 rounded-full bg-indigo-500/50"></div>
                      <div className="h-2 w-1/5 rounded-full bg-indigo-500/30"></div>
                    </div>
                  </div>

                  {/* Row 2: Votes live */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">Votes live</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                        <span className="text-xs font-medium text-emerald-300">Yes</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-slate-500/20 px-4 py-2">
                        <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                        <span className="text-xs font-medium text-slate-300">No</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Split costs with avatars */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">Split costs</span>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-indigo-400 to-indigo-600"></div>
                      <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-cyan-400 to-cyan-600"></div>
                      <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-purple-400 to-purple-600"></div>
                      <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-pink-400 to-pink-600"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
