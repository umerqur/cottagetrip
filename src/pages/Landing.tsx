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
      {/* Hero Section - Cottage Style */}
      <main className="relative h-screen w-full overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1595877244574-e90ce41ce089?q=80&w=687&auto=format&fit=crop")',
            filter: 'saturate(0.6) contrast(0.9)',
          }}
        />

        {/* Warm Overlay */}
        <div className="absolute inset-0 bg-[rgba(245,240,230,0.85)]" />

        {/* Content Container */}
        <div className="relative z-10 flex h-full items-center px-6 sm:px-8 lg:px-12">
          <div className="max-w-[520px] space-y-8">
            {/* Headline */}
            <h1 className="text-5xl font-bold leading-[1.15] tracking-tight text-[#2F241A] sm:text-6xl lg:text-7xl">
              Pick a cottage together.
            </h1>

            {/* Subheadline */}
            <p className="text-xl leading-relaxed text-[#6B5C4D] sm:text-2xl">
              Vote together, plan tasks, split costs.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={handleCreateRoom}
                className="rounded-lg bg-[#2F241A] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#1F1812] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
              >
                Create a room
              </button>
              <button
                onClick={handleJoinRoom}
                className="rounded-lg border-2 border-[#2F241A] bg-transparent px-8 py-4 text-base font-semibold text-[#2F241A] transition hover:bg-[rgba(47,36,26,0.05)] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
              >
                Join a room
              </button>
            </div>

            {/* Helper text */}
            <p className="text-sm text-[#6B5C4D]">
              Rooms are private. Join with a room code.
            </p>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
