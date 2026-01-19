import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50/30 to-sky-50/40">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-transparent to-sky-100/20"></div>

      {/* Top bar */}
      <nav className="relative z-10 border-b border-stone-200/60 bg-white/40 backdrop-blur-sm">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-stone-800">Cottage Trip</h1>
            <a
              href="/join"
              className="text-sm text-stone-600 transition hover:text-stone-900"
            >
              Sign in
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="flex min-h-[calc(100vh-73px)] items-center py-8">
          <div className="grid w-full gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column */}
            <div className="flex flex-col justify-center">
              {/* Headline */}
              <h2 className="mb-5 text-5xl font-bold leading-tight tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">
                Pick a cottage together.
              </h2>

              {/* Subheadline */}
              <p className="mb-8 text-xl text-stone-700 sm:text-2xl">
                Vote fast, plan the weekend, and split costs after.
              </p>

              {/* CTA Buttons */}
              <div className="mb-5 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() => navigate('/create')}
                  className="rounded-lg bg-gradient-to-br from-amber-600 to-orange-700 px-8 py-4 text-base font-semibold text-white shadow-md shadow-amber-900/20 transition hover:shadow-lg hover:shadow-amber-900/30 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
                >
                  Create a room
                </button>
                <button
                  onClick={() => navigate('/join')}
                  className="rounded-lg border-2 border-stone-300 bg-white/60 px-8 py-4 text-base font-semibold text-stone-800 backdrop-blur-sm transition hover:border-stone-400 hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2"
                >
                  Join a room
                </button>
              </div>

              {/* Privacy line */}
              <p className="text-sm text-stone-600">
                Rooms are private. Join with a room code.
              </p>
            </div>

            {/* Right Column - Cottage Visual */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="relative h-[400px] w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-sky-200 via-amber-100 to-emerald-200 shadow-xl">
                {/* Sky gradient */}
                <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-sky-300/80 to-sky-200/40"></div>

                {/* Lake shape - minimal curved form */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-sky-400/60 to-sky-300/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-sky-500/10 to-blue-400/20"></div>
                </div>

                {/* Treeline - abstract minimal shapes */}
                <div className="absolute bottom-[30%] left-0 right-0 flex items-end justify-center gap-1">
                  {/* Tree silhouettes */}
                  <div className="h-24 w-16 bg-gradient-to-t from-emerald-800/70 to-emerald-700/50" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                  <div className="h-32 w-20 bg-gradient-to-t from-emerald-800/60 to-emerald-700/40" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                  <div className="h-28 w-16 bg-gradient-to-t from-emerald-900/70 to-emerald-800/50" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                  <div className="h-20 w-14 bg-gradient-to-t from-emerald-800/60 to-emerald-700/40" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
