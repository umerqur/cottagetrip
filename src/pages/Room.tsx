import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRoomByCode, getRoomMembers } from '../lib/rooms'
import { getCottagesByRoomId, addCottage, extractAirbnbListingId, buildCanonicalAirbnbUrl } from '../lib/cottages'
import { getSupabase } from '../lib/supabase'
import { getProfilesByIds, type Profile } from '../lib/profiles'
import type { Room as RoomType, Cottage } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import AppShell from '../components/AppShell'

export default function Room() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const [room, setRoom] = useState<RoomType | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [cottages, setCottages] = useState<Cottage[]>([])
  const [cottageInput, setCottageInput] = useState('')
  const [addingCottage, setAddingCottage] = useState(false)
  const [cottageError, setCottageError] = useState<string | null>(null)
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([])

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

    // Get current user
    const supabase = getSupabase()
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }

    setRoom(roomData)
    setLoading(false)

    // Load cottages and members for this room
    loadCottages(roomData.id)
    loadMembers(roomData.id)
  }

  const loadCottages = async (roomId: string) => {
    const { cottages: cottagesData, error: cottagesError } = await getCottagesByRoomId(roomId)

    if (cottagesError) {
      console.error('Error loading cottages:', cottagesError)
      return
    }

    if (cottagesData) {
      setCottages(cottagesData)
    }
  }

  const loadMembers = async (roomId: string) => {
    const { members, error: membersError } = await getRoomMembers(roomId)

    if (membersError) {
      console.error('Error loading members:', membersError)
      return
    }

    if (members && members.length > 0) {
      // Get user IDs from members
      const userIds = members.map((m) => m.user_id)

      // Fetch profiles for these users
      const { profiles, error: profilesError } = await getProfilesByIds(userIds)

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        return
      }

      setMemberProfiles(profiles)
    }
  }

  const handleAddCottage = async () => {
    if (!room || !cottageInput.trim()) return

    setCottageError(null)

    // Extract listing ID from input
    const listingId = extractAirbnbListingId(cottageInput)

    if (!listingId) {
      setCottageError('Please paste the Airbnb share link for the cottage.')
      return
    }

    // Build canonical URL
    const canonicalUrl = buildCanonicalAirbnbUrl(listingId)

    setAddingCottage(true)

    try {
      const supabase = getSupabase()
      if (!supabase) {
        setCottageError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.')
        setAddingCottage(false)
        return
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setCottageError('You must be logged in to add a cottage.')
        setAddingCottage(false)
        return
      }

      // Add cottage to database
      const { cottage, error: addError } = await addCottage(room.id, canonicalUrl, user.id)

      if (addError || !cottage) {
        setCottageError(addError || 'Failed to add cottage')
        setAddingCottage(false)
        return
      }

      // Success - refresh cottages list and clear input
      setCottages([cottage, ...cottages])
      setCottageInput('')
    } catch (err) {
      console.error('Error adding cottage:', err)
      setCottageError('An unexpected error occurred')
    } finally {
      setAddingCottage(false)
    }
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
      <AppShell>
        <main className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-600 border-r-transparent"></div>
              <p className="mt-4 text-amber-800">Loading room...</p>
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  if (error || !room) {
    return (
      <AppShell>
        <main className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-5xl">🚫</div>
              <h2 className="text-2xl font-bold text-amber-900 mb-2">Room not found</h2>
              <p className="text-amber-800 mb-6">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="rounded-lg bg-amber-600 px-6 py-2 text-white hover:bg-amber-700 transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Go home
              </button>
            </div>
          </div>
        </main>
      </AppShell>
    )
  }

  // Compute isAdmin
  const isAdmin = currentUser?.id === room.owner_id

  return (
    <AppShell>
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

        {/* Members Section */}
        {memberProfiles.length > 0 && (
          <div className="mb-8 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Members ({memberProfiles.length})
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {memberProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900"
                  >
                    <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                    {profile.display_name}
                    {profile.id === room.owner_id && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-amber-600 px-2 py-0.5 text-xs font-medium text-white">
                        Admin
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State Sections */}
        <div className="space-y-6">
          {/* Cottages Section */}
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Cottages</h2>
            </div>
            <div className="px-6 py-6">
              {/* Add Cottage Form */}
              <div className="mb-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={cottageInput}
                    onChange={(e) => {
                      setCottageInput(e.target.value)
                      if (cottageError) setCottageError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !addingCottage && isAdmin) {
                        handleAddCottage()
                      }
                    }}
                    placeholder="Paste Airbnb link here..."
                    disabled={addingCottage || !isAdmin}
                    className={`flex-1 rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 transition ${
                      cottageError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } ${addingCottage || !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <button
                    onClick={handleAddCottage}
                    disabled={addingCottage || !cottageInput.trim() || !isAdmin}
                    className={`rounded-lg px-6 py-3 font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      addingCottage || !cottageInput.trim() || !isAdmin
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {addingCottage ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                        Adding...
                      </span>
                    ) : (
                      'Add Cottage'
                    )}
                  </button>
                </div>
                {cottageError && (
                  <p className="mt-2 text-sm text-red-600">{cottageError}</p>
                )}
                {!isAdmin && (
                  <p className="mt-2 text-sm text-gray-600">Only the admin can add cottages</p>
                )}
              </div>

              {/* Cottages List */}
              {cottages.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-3 text-4xl">🏡</div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">No cottages yet</h3>
                  <p className="text-sm text-gray-600">Paste an Airbnb link above to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cottages.map((cottage) => (
                    <div
                      key={cottage.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 px-4 py-3.5 hover:shadow-sm transition"
                    >
                      <div className="flex-1 min-w-0">
                        <a
                          href={cottage.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 hover:underline font-medium text-sm break-all"
                        >
                          {cottage.url}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          Added {new Date(cottage.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
    </AppShell>
  )
}
