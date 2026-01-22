import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

export default function Landing() {
  const navigate = useNavigate()

  const handleCreateRoom = async () => {
    const supabase = getSupabase()

    // If Supabase is not configured, show error on the /create page
    if (!supabase) {
      navigate('/create')
      return
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      navigate('/signin?next=/create')
    } else {
      navigate('/create')
    }
  }

  const handleJoinRoom = async () => {
    const supabase = getSupabase()

    // If Supabase is not configured, show error on the /join page
    if (!supabase) {
      navigate('/join')
      return
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      navigate('/signin?next=/join')
    } else {
      navigate('/join')
    }
  }

  return (
    <AppShell background="white">
      {/* Hero Section - Stripe Style */}
      <main className="relative mx-auto max-w-[1200px] px-6 py-12 sm:px-8 lg:px-12">
        <div className="grid min-h-[calc(100vh-73px)] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column - Text Content */}
          <div className="flex flex-col justify-center space-y-8 py-12 lg:py-0">
            {/* Headline */}
            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Pick a cottage together.
            </h1>

            {/* Subheadline */}
            <p className="text-xl leading-relaxed text-gray-600 sm:text-2xl">
              Vote together, plan tasks, split costs.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={handleCreateRoom}
                className="rounded-lg bg-gray-900 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 active:bg-gray-950"
              >
                Create a room
              </button>
              <button
                onClick={handleJoinRoom}
                className="rounded-lg border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-900 transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 active:bg-gray-100"
              >
                Join a room
              </button>
            </div>

            {/* Helper text */}
            <p className="text-sm text-gray-500">
              Rooms are private. Join with a room code.
            </p>
          </div>

          {/* Right Column - Visual Area */}
          <div className="relative order-first h-64 overflow-hidden rounded-2xl lg:order-last lg:h-[600px]">
            {/* Subtle background image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?q=80&w=2670&auto=format&fit=crop")',
              }}
            />
            {/* White gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent" />
          </div>
        </div>
      </main>
    </AppShell>
  )
}
