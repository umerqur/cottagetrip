import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getSupabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

export default function Landing() {
  const navigate = useNavigate()
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      <main className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-white">
        {/* Background Layer */}
        <div className="absolute inset-0">
          {/* Background Image with Responsive Blur */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: windowWidth < 640
                ? 'url("https://images.unsplash.com/photo-1595877244574-e90ce41ce089?q=95&w=1400&auto=format&fit=crop")'
                : windowWidth < 1024
                ? 'url("https://images.unsplash.com/photo-1595877244574-e90ce41ce089?q=90&w=1800&auto=format&fit=crop")'
                : 'url("https://images.unsplash.com/photo-1595877244574-e90ce41ce089?q=90&w=2400&auto=format&fit=crop")',
              filter: windowWidth < 640
                ? 'blur(0.5px) contrast(1.12) saturate(1.18)'
                : 'blur(3px) contrast(1) saturate(1.1)',
              transform: 'scale(1.05)',
            }}
          />

          {/* Gradient Overlay - Responsive Direction */}
          <div
            className="absolute inset-0"
            style={{
              background: windowWidth < 640
                ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.92) 15%, rgba(255,255,255,0.78) 35%, rgba(255,255,255,0.5) 60%, rgba(255,255,255,0.15) 85%)'
                : 'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.92) 25%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0) 70%)',
            }}
          />

          {/* Mobile only bottom fade to white */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-white via-white/95 to-transparent sm:hidden" />
        </div>

        {/* Content Container */}
        <div
          className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-start px-5 pt-8 pb-0 sm:items-center sm:px-8 sm:py-24"
          style={{
            paddingTop: windowWidth < 640 ? 'calc(env(safe-area-inset-top) + 16px)' : undefined,
          }}
        >
          <div className="max-w-[520px] space-y-5 sm:space-y-8">
            {/* Headline */}
            <h1 className="text-5xl font-bold leading-[1.15] tracking-tight text-[#2F241A] sm:text-6xl lg:text-7xl">
              Pick a cottage together.
            </h1>

            {/* Subheadline */}
            <p className="text-xl leading-relaxed text-[#6B5C4D] sm:text-2xl">
              Vote on cottages, plan tasks, split costs.
            </p>

            {/* Desktop and tablet CTAs (unchanged behavior) */}
            <div className="hidden sm:block">
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <button
                  onClick={handleCreateRoom}
                  className="rounded-lg bg-[#2F241A] px-8 py-3 text-base font-semibold text-white transition hover:bg-[#1F1812] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 sm:py-4"
                >
                  Create a room
                </button>
                <button
                  onClick={handleJoinRoom}
                  className="rounded-lg border-2 border-[#2F241A] bg-transparent px-8 py-3 text-base font-semibold text-[#2F241A] transition hover:bg-[rgba(47,36,26,0.05)] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 sm:py-4"
                >
                  Join a room
                </button>
              </div>

              <p
                className="text-sm text-[#6B5C4D] sm:text-[#6B5C4D]"
                style={{
                  color: windowWidth < 640 ? '#4A3D32' : undefined,
                  textShadow: windowWidth < 640 ? '0 1px 2px rgba(255,255,255,0.8)' : undefined,
                }}
              >
                Rooms are private. Join with a room code.
              </p>
            </div>

            {/* Mobile bottom sheet */}
            <div className="sm:hidden">
              <div className="fixed inset-x-0 bottom-0 z-20">
                <div className="mx-auto max-w-6xl px-5 pb-6">
                  <div className="rounded-2xl bg-white/98 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur">
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleCreateRoom}
                        className="w-full rounded-xl bg-[#2F241A] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#1F1812] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
                      >
                        Create a room
                      </button>
                      <button
                        onClick={handleJoinRoom}
                        className="w-full rounded-xl border-2 border-[#2F241A] bg-white px-6 py-4 text-base font-semibold text-[#2F241A] transition hover:bg-[rgba(47,36,26,0.05)] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
                      >
                        Join a room
                      </button>
                    </div>

                    <p className="mt-3 text-sm text-[#4A3D32]">
                      Rooms are private. Join with a room code.
                    </p>
                  </div>
                </div>
              </div>

              {/* Spacer so top content does not get covered by fixed panel */}
              <div className="h-44" />
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
