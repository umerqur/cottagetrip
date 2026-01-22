import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRoomByCode, getRoomMembers } from '../lib/rooms'
import { getCottagesByRoomId, addCottageWithImage, deleteCottage, updateCottage, type CottagePayload } from '../lib/cottages'
import { getVotesByRoom, toggleVote } from '../lib/votes'
import { getCottageImageUrl } from '../lib/storage'
import { getSupabase } from '../lib/supabase'
import { getProfilesByIds, type Profile } from '../lib/profiles'
import { getRoomSelection, selectCottage, clearRoomSelection } from '../lib/selections'
import { getRoomTasks, createRoomTask, updateRoomTask, deleteRoomTask } from '../lib/tasks'
import { validateTripDates } from '../lib/trip-dates'
import type { Room as RoomType, Cottage, RoomMember, RoomSelection, RoomTask } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import AppShell from '../components/AppShell'
import PageShell from '../components/PageShell'
import CTAButton from '../components/CTAButton'
import StatusBadge from '../components/StatusBadge'
import TripDates from '../components/TripDates'
import TripDatesBadge from '../components/TripDatesBadge'
import UserMenu from '../components/UserMenu'

export default function Room() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const [room, setRoom] = useState<RoomType | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [cottages, setCottages] = useState<Cottage[]>([])
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([])
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([])
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map())
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCottage, setEditingCottage] = useState<Cottage | null>(null)
  const [roomSelection, setRoomSelection] = useState<RoomSelection | null>(null)
  const [tasks, setTasks] = useState<RoomTask[]>([])
  const [activeTab, setActiveTab] = useState<'listings' | 'assignments'>('listings')
  const [selectingCottage, setSelectingCottage] = useState<Cottage | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [changingSelection, setChangingSelection] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showTripDatesError, setShowTripDatesError] = useState(false)

  useEffect(() => {
    if (!code) {
      setError('No room code provided')
      setLoading(false)
      return
    }

    let cancelled = false

    const loadRoomData = async () => {
      setLoading(true)
      setError(null)

      const { room: roomData, error: roomError } = await getRoomByCode(code)

      if (cancelled) return

      if (roomError || !roomData) {
        setError(roomError || 'Room not found')
        setLoading(false)
        return
      }

      // Get current user
      const supabase = getSupabase()
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!cancelled) setCurrentUser(user)
      }

      if (!cancelled) {
        setRoom(roomData)
        setLoading(false)

        // Load all data in parallel
        loadCottages(roomData.id)
        loadMembers(roomData.id)
        loadVotes(roomData.id)
        loadRoomSelection(roomData.id)
        loadTasks(roomData.id)
      }
    }

    loadRoomData()

    return () => {
      cancelled = true
    }
  }, [code])


  const loadCottages = async (roomId: string) => {
    const { cottages: cottagesData, error: cottagesError } = await getCottagesByRoomId(roomId)

    if (cottagesError) {
      return
    }

    if (cottagesData) {
      setCottages(cottagesData)
    }
  }

  const loadMembers = async (roomId: string) => {
    const { members, error: membersError } = await getRoomMembers(roomId)

    if (membersError) {
      return
    }

    if (members && members.length > 0) {
      setRoomMembers(members)

      const userIds = members.map((m) => m.user_id)
      const { profiles, error: profilesError } = await getProfilesByIds(userIds)

      if (!profilesError && profiles) {
        setMemberProfiles(profiles)
      }
    }
  }

  const loadVotes = async (roomId: string) => {
    const { voteCounts: counts, userVotes: votes } = await getVotesByRoom(roomId)
    setVoteCounts(counts)
    setUserVotes(votes)
  }

  const loadRoomSelection = async (roomId: string) => {
    const { selection, error } = await getRoomSelection(roomId)
    if (!error && selection) {
      setRoomSelection(selection)
    }
  }

  const loadTasks = async (roomId: string) => {
    const { tasks: tasksData, error } = await getRoomTasks(roomId)
    if (!error && tasksData) {
      setTasks(tasksData)
    }
  }

  const handleVoteToggle = async (cottageId: string) => {
    if (!room || !currentUser) return

    const { voteCounts: counts, userVotes: votes } = await toggleVote(
      room.id,
      cottageId,
      currentUser.id
    )
    setVoteCounts(counts)
    setUserVotes(votes)
  }

  const handleDeleteCottage = async (cottageId: string) => {
    if (!room) return
    if (!confirm('Are you sure you want to delete this listing?')) return

    const { error: deleteError } = await deleteCottage(cottageId)
    if (!deleteError) {
      setCottages(cottages.filter(c => c.id !== cottageId))
      // Reload votes to update counts
      loadVotes(room.id)
    }
  }

  const handleSelectCottage = async () => {
    if (!room || !selectingCottage) return

    // Validate trip dates before allowing selection
    const validation = validateTripDates(room.trip_start_date, room.trip_end_date)
    if (!validation.valid) {
      setShowTripDatesError(true)
      setSelectingCottage(null)
      // Hide error after 5 seconds
      setTimeout(() => setShowTripDatesError(false), 5000)
      return
    }

    setIsSelecting(true)
    const { selection, error } = await selectCottage(room.id, selectingCottage.id)

    if (!error && selection) {
      setRoomSelection(selection)
      setSelectingCottage(null)
      // Switch to Assignments tab
      setActiveTab('assignments')
    } else if (error) {
      alert(`Failed to select cottage: ${error}`)
    }

    setIsSelecting(false)
  }

  const handleChangeSelectedCottage = async () => {
    if (!room) return

    setIsClearing(true)
    const { success, error } = await clearRoomSelection(room.id)

    if (success) {
      setRoomSelection(null)
      setChangingSelection(false)
      // Switch back to Listings tab
      setActiveTab('listings')
      // Reload tasks to clear them
      setTasks([])
    } else if (error) {
      alert(`Failed to clear selection: ${error}`)
    }

    setIsClearing(false)
  }

  const handleCopyCode = async () => {
    if (!room) return

    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Failed to copy
    }
  }

  const handleShareRoom = async () => {
    if (!room) return

    try {
      const shareUrl = `${window.location.origin}/room/${room.code}`
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      // Failed to copy
    }
  }

  const handleTripDatesUpdated = (startDate: string | null, endDate: string | null) => {
    if (!room) return
    setRoom({
      ...room,
      trip_start_date: startDate,
      trip_end_date: endDate
    })
    // Hide error if dates are now valid
    if (showTripDatesError) {
      const validation = validateTripDates(startDate, endDate)
      if (validation.valid) {
        setShowTripDatesError(false)
      }
    }
  }

  // Custom navbar with TripDatesBadge and UserMenu
  const navRight = room ? (
    <div className="flex items-center gap-3">
      <TripDatesBadge
        startDate={room.trip_start_date}
        endDate={room.trip_end_date}
      />
      <UserMenu />
    </div>
  ) : (
    <UserMenu />
  )

  if (loading) {
    return (
      <AppShell background="white" navRight={<UserMenu />}>
        <PageShell maxWidth="xl">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#2F241A] border-r-transparent"></div>
              <p className="mt-4 text-[#6B5C4D]">Loading room...</p>
            </div>
          </div>
        </PageShell>
      </AppShell>
    )
  }

  if (error || !room) {
    return (
      <AppShell background="white" navRight={<UserMenu />}>
        <PageShell maxWidth="xl">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-5xl">🚫</div>
              <h2 className="text-2xl font-bold text-[#2F241A] mb-2">Room not found</h2>
              <p className="text-[#6B5C4D] mb-6">{error}</p>
              <CTAButton variant="primary" onClick={() => navigate('/')}>
                Go home
              </CTAButton>
            </div>
          </div>
        </PageShell>
      </AppShell>
    )
  }

  const isAdmin = currentUser?.id === room.owner_id

  return (
    <AppShell background="white" navRight={navRight}>
      <PageShell maxWidth="xl">
        {/* Room Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#2F241A]">Room</h1>
            {/* Monospace Code Chip */}
            <div className="inline-flex items-center gap-2 rounded-md bg-[#FAFAF9] px-2.5 py-1 border border-[rgba(47,36,26,0.1)]">
              <code className="text-xs font-mono font-semibold text-[#6B5C4D] tracking-wider">{room.code}</code>
              <button
                onClick={handleCopyCode}
                className="text-[#6B5C4D] hover:text-[#6B5C4D] transition-colors"
                title="Copy room code"
              >
                {copied ? (
                  <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Member Avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {roomMembers.slice(0, 6).map((member) => {
                const profile = memberProfiles.find((p) => p.id === member.user_id)
                const displayName = profile?.display_name || 'Member'
                const isOwner = member.user_id === room.owner_id
                const isCurrent = member.user_id === currentUser?.id
                const tooltipText = isOwner ? `${displayName} (Admin)` : displayName

                // Admin gets ring, current non-admin gets border, others get white border
                const ringColor = isOwner ? 'ring-2 ring-[#2F241A] ring-offset-2' : isCurrent ? 'border-2 border-[rgba(47,36,26,0.2)]' : 'border-2 border-white'

                return (
                  <div
                    key={member.user_id}
                    className="relative group"
                    title={tooltipText}
                  >
                    <div
                      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-700 text-white font-medium text-sm transition-all duration-200 hover:scale-110 hover:z-10 focus:outline-none focus:scale-110 focus:z-10 ${ringColor}`}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    {isOwner && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-[#FAFAF9]0 rounded-full flex items-center justify-center border-2 border-white shadow-sm transition-transform duration-200 group-hover:scale-110">
                        <svg
                          className="h-3 w-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )
              })}
              {roomMembers.length > 6 && (
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 text-slate-700 font-medium text-xs border-2 border-white">
                  +{roomMembers.length - 6}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action Row */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3">
          <CTAButton
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            disabled={!isAdmin}
          >
            Create listing
          </CTAButton>
          <CTAButton
            variant="secondary"
            onClick={handleShareRoom}
          >
            {shareCopied ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </span>
            ) : (
              'Share room'
            )}
          </CTAButton>
          {!isAdmin && (
            <p className="text-sm text-[#6B5C4D] sm:self-center">Only admins can add listings</p>
          )}
        </div>

        {/* Selected Cottage Banner */}
        {roomSelection && (
          <div className="mb-6 rounded-lg bg-white/70 backdrop-blur-sm border border-green-200 shadow-sm px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">
                    {cottages.find(c => c.id === roomSelection.cottage_id)?.name || 'Cottage selected'}
                  </h3>
                  <p className="text-sm text-green-800">
                    Selected by {memberProfiles.find(p => p.id === roomSelection.selected_by)?.display_name || 'Unknown'} on{' '}
                    {new Date(roomSelection.selected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setChangingSelection(true)}
                  className="px-4 py-2 text-sm font-medium text-green-900 bg-white/70 border border-green-300 rounded-lg hover:border-green-500 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition whitespace-nowrap"
                >
                  Change selected cottage
                </button>
              )}
            </div>
          </div>
        )}

        {/* Trip Dates */}
        <div
          id="trip-dates-section"
          className="mb-6 rounded-lg bg-white/70 backdrop-blur-sm border border-[rgba(47,36,26,0.1)] shadow-sm px-6 py-4"
        >
          <TripDates
            roomId={room.id}
            isAdmin={isAdmin}
            startDate={room.trip_start_date}
            endDate={room.trip_end_date}
            onDatesUpdated={handleTripDatesUpdated}
            showError={showTripDatesError}
          />
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-[rgba(47,36,26,0.1)]">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('listings')}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition ${
                activeTab === 'listings'
                  ? 'border-[#2F241A] text-[#2F241A]'
                  : 'border-transparent text-[#6B5C4D] hover:text-[#2F241A] hover:border-[rgba(47,36,26,0.2)]'
              }`}
            >
              Listings
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              disabled={!roomSelection}
              title={!roomSelection ? 'Select a cottage to unlock assignments' : ''}
              className={`pb-3 px-1 font-semibold text-sm border-b-2 transition ${
                activeTab === 'assignments'
                  ? 'border-[#2F241A] text-[#2F241A]'
                  : 'border-transparent text-[#6B5C4D] hover:text-[#2F241A] hover:border-[rgba(47,36,26,0.2)]'
              } ${!roomSelection ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Trip assignments
              {!roomSelection && <span className="ml-1 text-xs font-normal">(select a cottage first)</span>}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'listings' ? (
          /* Listings Grid */
          cottages.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-[rgba(47,36,26,0.1)] bg-white/50 backdrop-blur-sm py-20 text-center">
              <div className="mb-4 text-6xl">🏡</div>
              <h3 className="text-xl font-semibold text-[#2F241A] mb-2">No listings yet</h3>
              <p className="text-[#6B5C4D]">
                {isAdmin ? 'Click "Create listing" to add your first cottage.' : 'Ask the admin to add some listings.'}
              </p>
            </div>
          ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 ${cottages.length === 1 ? 'justify-items-center' : 'justify-items-stretch'}`}>
            {cottages.map((cottage) => {
              const imageUrl = cottage.image_path ? getCottageImageUrl(cottage.image_path) : null
              const voteCount = voteCounts.get(cottage.id) || 0
              const hasVoted = userVotes.has(cottage.id)
              const memberCount = roomMembers.length
              const perPersonPrice = cottage.total_price && memberCount > 0
                ? Math.round(cottage.total_price / memberCount)
                : null

              return (
                <div
                  key={cottage.id}
                  className="group w-full max-w-[420px] rounded-xl border border-[rgba(47,36,26,0.1)] bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden hover:shadow-lg hover:border-[rgba(47,36,26,0.2)] transition-all"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-slate-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={cottage.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Admin Menu - visible on hover (desktop) or always visible (mobile) */}
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingCottage(cottage)}
                          className="rounded-lg bg-white/95 backdrop-blur p-1.5 text-[#6B5C4D] hover:bg-white hover:text-[#2F241A] transition shadow-sm"
                          title="Edit listing"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCottage(cottage.id)}
                          className="rounded-lg bg-white/95 backdrop-blur p-1.5 text-[#6B5C4D] hover:bg-white hover:text-red-600 transition shadow-sm"
                          title="Delete listing"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-xl font-bold text-[#2F241A] leading-tight">{cottage.name}</h3>
                        {perPersonPrice && (
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-2xl text-[#2F241A]">
                              ${perPersonPrice}
                            </div>
                            <div className="text-xs text-[#6B5C4D] font-medium">
                              per person
                            </div>
                          </div>
                        )}
                      </div>
                      {cottage.sleeps && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-[#6B5C4D]">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Sleeps {cottage.sleeps}
                        </span>
                      )}
                    </div>

                    {/* View Listing Button */}
                    {cottage.url ? (
                      <a
                        href={cottage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 mb-2 text-sm font-semibold text-[#2F241A] bg-white/80 border border-[rgba(47,36,26,0.2)] hover:border-[#2F241A] hover:bg-white transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2"
                      >
                        {cottage.url.includes('airbnb') ? 'View on Airbnb' : 'View listing'}
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 mb-2 text-sm font-semibold text-gray-400 bg-white/50 border border-[rgba(47,36,26,0.1)] cursor-not-allowed"
                      >
                        Link required
                      </button>
                    )}

                    {/* Select Cottage Button (Admin only, if not already selected) */}
                    {isAdmin && !roomSelection && (
                      <>
                        <button
                          onClick={() => {
                            const validation = validateTripDates(room.trip_start_date, room.trip_end_date)
                            if (!validation.valid) {
                              setShowTripDatesError(true)
                              setTimeout(() => setShowTripDatesError(false), 5000)
                            } else {
                              setSelectingCottage(cottage)
                            }
                          }}
                          className="w-full rounded-lg px-4 py-2.5 mb-2 font-semibold text-white bg-[#2F241A] hover:bg-[#1F1812] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 active:bg-[#1F1812] shadow-sm"
                        >
                          Select this cottage
                        </button>
                      </>
                    )}

                    {/* Selected Badge */}
                    {roomSelection?.cottage_id === cottage.id && (
                      <StatusBadge variant="selected" className="mb-2">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Selected
                      </StatusBadge>
                    )}

                    {/* Vote Button - Disabled after cottage selection */}
                    <button
                      onClick={() => handleVoteToggle(cottage.id)}
                      disabled={!currentUser || !!roomSelection}
                      className={`w-full rounded-lg px-4 py-2.5 font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        hasVoted
                          ? 'bg-[#2F241A] text-white hover:bg-[#1F1812] focus:ring-[#2F241A] active:bg-[#1F1812] shadow-sm'
                          : 'bg-white/80 text-[#2F241A] border border-[rgba(47,36,26,0.2)] hover:bg-white focus:ring-[#2F241A]'
                      } ${!currentUser || roomSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-5 w-5" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                      </span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          )
        ) : (
          /* Assignments Tab */
          <AssignmentsTab
            roomId={room.id}
            tasks={tasks}
            setTasks={setTasks}
            roomMembers={roomMembers}
            memberProfiles={memberProfiles}
            isAdmin={isAdmin}
          />
        )}

        {/* Create Listing Modal */}
        {showCreateModal && (
          <CreateListingModal
            roomId={room.id}
            currentUser={currentUser}
            onClose={() => setShowCreateModal(false)}
            onSuccess={(cottage) => {
              setCottages([cottage, ...cottages])
              setShowCreateModal(false)
            }}
          />
        )}

        {/* Edit Listing Modal */}
        {editingCottage && (
          <EditListingModal
            cottage={editingCottage}
            currentUser={currentUser}
            onClose={() => setEditingCottage(null)}
            onSuccess={(updatedCottage) => {
              setCottages(cottages.map(c => c.id === updatedCottage.id ? updatedCottage : c))
              setEditingCottage(null)
            }}
          />
        )}

        {/* Select Cottage Confirmation Modal */}
        {selectingCottage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-[#2F241A] mb-2">Select this cottage?</h3>
              <p className="text-[#6B5C4D] mb-4">
                Are you sure you want to select <strong>{selectingCottage.name}</strong>? This will enable the Assignments tab where you can assign tasks to team members.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setSelectingCottage(null)}
                  disabled={isSelecting}
                  className="px-4 py-2 text-sm font-medium text-[#2F241A] bg-white border border-[rgba(47,36,26,0.2)] rounded-lg hover:bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSelectCottage}
                  disabled={isSelecting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2F241A] rounded-lg hover:bg-[#1F1812] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:opacity-50 shadow-sm"
                >
                  {isSelecting ? 'Selecting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Selected Cottage Confirmation Modal */}
        {changingSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-[#2F241A] mb-2">Change selected cottage?</h3>
              <p className="text-[#6B5C4D] mb-4">
                This will clear the current selection and all associated assignments. You will be able to select a different cottage and re-enable voting.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setChangingSelection(false)}
                  disabled={isClearing}
                  className="px-4 py-2 text-sm font-medium text-[#2F241A] bg-white border border-[rgba(47,36,26,0.2)] rounded-lg hover:bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeSelectedCottage}
                  disabled={isClearing}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2F241A] rounded-lg hover:bg-[#1F1812] focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:opacity-50 shadow-sm"
                >
                  {isClearing ? 'Clearing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </AppShell>
  )
}

// Create Listing Modal Component
function CreateListingModal({
  roomId,
  currentUser,
  onClose,
  onSuccess,
}: {
  roomId: string
  currentUser: User | null
  onClose: () => void
  onSuccess: (cottage: Cottage) => void
}) {
  const [formData, setFormData] = useState<CottagePayload>({
    name: '',
    description: '',
    url: '',
    sleeps: undefined,
    total_price: undefined,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL is required')
      return false
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlError('URL must start with http:// or https://')
      return false
    }

    // If it's an Airbnb link, validate domain
    if (url.includes('airbnb')) {
      if (!url.includes('airbnb.com') && !url.includes('airbnb.ca')) {
        setUrlError('Airbnb URLs must be from airbnb.com or airbnb.ca')
        return false
      }
    }

    setUrlError(null)
    return true
  }

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, url })
    if (url.trim()) {
      validateUrl(url)
    } else {
      setUrlError('URL is required')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser || !selectedFile) return

    if (!formData.name.trim()) {
      setError('Title is required')
      return
    }

    if (!validateUrl(formData.url || '')) {
      setError('Please provide a valid URL')
      return
    }

    setSubmitting(true)
    setError(null)

    // Ensure url is never null
    const payload: CottagePayload = {
      ...formData,
      url: formData.url || '',
    }

    const { cottage, error: submitError } = await addCottageWithImage(
      roomId,
      payload,
      selectedFile,
      currentUser.id
    )

    if (submitError || !cottage) {
      setError(submitError || 'Failed to create listing')
      setSubmitting(false)
      return
    }

    onSuccess(cottage)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[rgba(47,36,26,0.1)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#2F241A]">Create Listing</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[#6B5C4D] hover:text-[#6B5C4D] transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-[#2F241A] mb-2">
              Image <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                    }}
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-2 text-gray-700 hover:bg-white hover:text-red-600 transition shadow-sm"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-600">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#2F241A] mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={submitting}
              className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
              placeholder="e.g., Cozy Lakefront Cottage"
            />
          </div>

          {/* URL */}
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-[#2F241A] mb-2">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="url"
              value={formData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={submitting}
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 disabled:bg-[#FAFAF9] disabled:cursor-not-allowed ${
                urlError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-[rgba(47,36,26,0.2)] focus:ring-[#2F241A] focus:border-[#2F241A]'
              }`}
              placeholder="https://www.airbnb.com/rooms/..."
            />
            {urlError && (
              <p className="mt-1 text-sm text-red-600">{urlError}</p>
            )}
          </div>

          {/* Sleeps and Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sleeps" className="block text-sm font-medium text-[#2F241A] mb-2">
                Sleeps (optional)
              </label>
              <input
                type="number"
                id="sleeps"
                min="1"
                value={formData.sleeps || ''}
                onChange={(e) => setFormData({ ...formData, sleeps: e.target.value ? parseInt(e.target.value) : undefined })}
                disabled={submitting}
                className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
                placeholder="4"
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-[#2F241A] mb-2">
                Total price (optional)
              </label>
              <input
                type="number"
                id="price"
                min="0"
                value={formData.total_price || ''}
                onChange={(e) => setFormData({ ...formData, total_price: e.target.value ? parseInt(e.target.value) : undefined })}
                disabled={submitting}
                className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
                placeholder="Total price for the stay (from Airbnb)"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[#2F241A] mb-2">
              Notes (optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={submitting}
              rows={3}
              className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
              placeholder="Any additional notes about this listing..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-6 py-2 font-medium text-[#2F241A] hover:bg-[#FAFAF9] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || !formData.name.trim() || !formData.url?.trim() || !!urlError || submitting}
              className="rounded-lg bg-[#2F241A] px-6 py-2 font-semibold text-white hover:bg-[#1F1812] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed active:bg-[#1F1812] shadow-sm"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                  Creating...
                </span>
              ) : (
                'Create listing'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Listing Modal Component
function EditListingModal({
  cottage,
  currentUser,
  onClose,
  onSuccess,
}: {
  cottage: Cottage
  currentUser: User | null
  onClose: () => void
  onSuccess: (cottage: Cottage) => void
}) {
  const [formData, setFormData] = useState<CottagePayload>({
    name: cottage.name,
    description: cottage.description || '',
    url: cottage.url || '',
    sleeps: cottage.sleeps || undefined,
    total_price: cottage.total_price || undefined,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL is required')
      return false
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlError('URL must start with http:// or https://')
      return false
    }

    // If it's an Airbnb link, validate domain
    if (url.includes('airbnb')) {
      if (!url.includes('airbnb.com') && !url.includes('airbnb.ca')) {
        setUrlError('Airbnb URLs must be from airbnb.com or airbnb.ca')
        return false
      }
    }

    setUrlError(null)
    return true
  }

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, url })
    if (url.trim()) {
      validateUrl(url)
    } else {
      setUrlError('URL is required')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) return

    if (!formData.name.trim()) {
      setError('Title is required')
      return
    }

    if (!validateUrl(formData.url || '')) {
      setError('Please provide a valid URL')
      return
    }

    setSubmitting(true)
    setError(null)

    // Ensure url is never null
    const payload: CottagePayload = {
      ...formData,
      url: formData.url || '',
    }

    const { cottage: updatedCottage, error: submitError } = await updateCottage(
      cottage.id,
      payload,
      selectedFile || undefined
    )

    if (submitError || !updatedCottage) {
      setError(submitError || 'Failed to update listing')
      setSubmitting(false)
      return
    }

    onSuccess(updatedCottage)
  }

  const currentImageUrl = cottage.image_path ? getCottageImageUrl(cottage.image_path) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[rgba(47,36,26,0.1)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#2F241A]">Edit Listing</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[#6B5C4D] hover:text-[#6B5C4D] transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-[#2F241A] mb-2">
              Image {selectedFile && <span className="text-[#6B5C4D]">(optional - leave to keep current)</span>}
            </label>
            <div className="relative">
              {previewUrl || currentImageUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl || currentImageUrl || ''}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
                  />
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null)
                        setPreviewUrl(null)
                      }}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-2 text-gray-700 hover:bg-white hover:text-red-600 transition shadow-sm"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {!previewUrl && (
                    <label className="absolute bottom-2 right-2 cursor-pointer bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white transition shadow-sm">
                      Change image
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={submitting}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-600">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-[#2F241A] mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={submitting}
              className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
              placeholder="e.g., Cozy Lakefront Cottage"
            />
          </div>

          {/* URL */}
          <div>
            <label htmlFor="edit-url" className="block text-sm font-medium text-[#2F241A] mb-2">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="edit-url"
              value={formData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={submitting}
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 disabled:bg-[#FAFAF9] disabled:cursor-not-allowed ${
                urlError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-[rgba(47,36,26,0.2)] focus:ring-[#2F241A] focus:border-[#2F241A]'
              }`}
              placeholder="https://www.airbnb.com/rooms/..."
            />
            {urlError && (
              <p className="mt-1 text-sm text-red-600">{urlError}</p>
            )}
          </div>

          {/* Sleeps and Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-sleeps" className="block text-sm font-medium text-[#2F241A] mb-2">
                Sleeps (optional)
              </label>
              <input
                type="number"
                id="edit-sleeps"
                min="1"
                value={formData.sleeps || ''}
                onChange={(e) => setFormData({ ...formData, sleeps: e.target.value ? parseInt(e.target.value) : undefined })}
                disabled={submitting}
                className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
                placeholder="4"
              />
            </div>
            <div>
              <label htmlFor="edit-price" className="block text-sm font-medium text-[#2F241A] mb-2">
                Total price (optional)
              </label>
              <input
                type="number"
                id="edit-price"
                min="0"
                value={formData.total_price || ''}
                onChange={(e) => setFormData({ ...formData, total_price: e.target.value ? parseInt(e.target.value) : undefined })}
                disabled={submitting}
                className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
                placeholder="Total price for the stay"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-[#2F241A] mb-2">
              Notes (optional)
            </label>
            <textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={submitting}
              rows={3}
              className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
              placeholder="Any additional notes about this listing..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-6 py-2 font-medium text-[#2F241A] hover:bg-[#FAFAF9] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || !formData.url?.trim() || !!urlError || submitting}
              className="rounded-lg bg-[#2F241A] px-6 py-2 font-semibold text-white hover:bg-[#1F1812] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed active:bg-[#1F1812] shadow-sm"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                  Updating...
                </span>
              ) : (
                'Update listing'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Assignments Tab Component
function AssignmentsTab({
  roomId,
  tasks,
  setTasks,
  roomMembers,
  memberProfiles,
  isAdmin,
}: {
  roomId: string
  tasks: RoomTask[]
  setTasks: React.Dispatch<React.SetStateAction<RoomTask[]>>
  roomMembers: RoomMember[]
  memberProfiles: Profile[]
  isAdmin: boolean
}) {
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskName, setEditTaskName] = useState('')
  const [editTaskAssignee, setEditTaskAssignee] = useState<string>('')

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return

    setIsAdding(true)
    const { task, error } = await createRoomTask(
      roomId,
      newTaskName.trim(),
      newTaskAssignee || null
    )

    if (!error && task) {
      setTasks([...tasks, task])
      setNewTaskName('')
      setNewTaskAssignee('')

      // Invoke edge function to notify about task assignment
      const supabase = getSupabase()
      if (supabase) {
        await supabase.functions.invoke("notify_task_assigned", {
          body: { task_id: task.id },
        })
      }
    } else if (error) {
      alert(`Failed to create task: ${error}`)
    }

    setIsAdding(false)
  }

  const handleUpdateTask = async (taskId: string) => {
    if (!editTaskName.trim()) return

    const { task, error } = await updateRoomTask(taskId, {
      task_name: editTaskName.trim(),
      assigned_to: editTaskAssignee || null
    })

    if (!error && task) {
      setTasks(tasks.map(t => t.id === task.id ? task : t))
      setEditingTaskId(null)
    } else if (error) {
      alert(`Failed to update task: ${error}`)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    const { success, error } = await deleteRoomTask(taskId)

    if (success) {
      setTasks(tasks.filter(t => t.id !== taskId))
    } else if (error) {
      alert(`Failed to delete task: ${error}`)
    }
  }

  const startEditing = (task: RoomTask) => {
    setEditingTaskId(task.id)
    setEditTaskName(task.task_name)
    setEditTaskAssignee(task.assigned_to || '')
  }

  const cancelEditing = () => {
    setEditingTaskId(null)
    setEditTaskName('')
    setEditTaskAssignee('')
  }

  return (
    <div>
      {/* Add Task Form (Admin only) */}
      {isAdmin && (
        <div className="mb-6 rounded-xl border border-[rgba(47,36,26,0.1)] bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#2F241A] mb-4">Add Task</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Task name (e.g., Book cottage, Split payment)"
              disabled={isAdding}
              className="flex-1 rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddTask()
                }
              }}
            />
            <select
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              disabled={isAdding}
              className="rounded-lg border border-[rgba(47,36,26,0.2)] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:border-[#2F241A] disabled:bg-[#FAFAF9] disabled:cursor-not-allowed"
            >
              <option value="">Unassigned</option>
              {roomMembers.map((member) => {
                const profile = memberProfiles.find(p => p.id === member.user_id)
                return (
                  <option key={member.user_id} value={member.user_id}>
                    {profile?.display_name || 'Member'}
                  </option>
                )
              })}
            </select>
            <button
              onClick={handleAddTask}
              disabled={!newTaskName.trim() || isAdding}
              className="rounded-lg bg-[#2F241A] px-6 py-2.5 font-semibold text-white hover:bg-[#1F1812] transition focus:outline-none focus:ring-2 focus:ring-[#2F241A] focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed active:bg-[#1F1812] shadow-sm whitespace-nowrap"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="rounded-xl border border-[rgba(47,36,26,0.1)] bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[rgba(47,36,26,0.1)]">
            <thead className="bg-[#FAFAF9]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[#2F241A] uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[#2F241A] uppercase tracking-wider">
                  Assignee
                </th>
                {isAdmin && (
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#2F241A] uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white/70 divide-y divide-[rgba(47,36,26,0.05)]">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 3 : 2} className="px-6 py-12 text-center text-[#6B5C4D]">
                    {isAdmin ? 'No tasks yet. Add your first task above.' : 'No tasks assigned yet.'}
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const assigneeProfile = task.assigned_to
                    ? memberProfiles.find(p => p.id === task.assigned_to)
                    : null

                  return (
                    <tr key={task.id} className="hover:bg-[#FAFAF9]/50 transition">
                      <td className="px-6 py-4">
                        {editingTaskId === task.id ? (
                          <input
                            type="text"
                            value={editTaskName}
                            onChange={(e) => setEditTaskName(e.target.value)}
                            className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F241A]"
                            autoFocus
                          />
                        ) : (
                          <div className="text-sm font-medium text-[#2F241A]">{task.task_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingTaskId === task.id ? (
                          <select
                            value={editTaskAssignee}
                            onChange={(e) => setEditTaskAssignee(e.target.value)}
                            className="w-full rounded-lg border border-[rgba(47,36,26,0.2)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F241A]"
                          >
                            <option value="">Unassigned</option>
                            {roomMembers.map((member) => {
                              const profile = memberProfiles.find(p => p.id === member.user_id)
                              return (
                                <option key={member.user_id} value={member.user_id}>
                                  {profile?.display_name || 'Member'}
                                </option>
                              )
                            })}
                          </select>
                        ) : (
                          <div className="text-sm">
                            {assigneeProfile ? (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(47,36,26,0.1)] text-[#2F241A] font-medium">
                                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-white text-xs">
                                  {assigneeProfile.display_name.charAt(0).toUpperCase()}
                                </span>
                                {assigneeProfile.display_name}
                              </span>
                            ) : (
                              <span className="text-[#6B5C4D] italic">Unassigned</span>
                            )}
                          </div>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          {editingTaskId === task.id ? (
                            <div className="flex gap-3 justify-end">
                              <button
                                onClick={() => handleUpdateTask(task.id)}
                                className="text-[#6B5C4D] hover:text-[#2F241A] font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-[#6B5C4D] hover:text-[#2F241A] font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-3 justify-end">
                              <button
                                onClick={() => startEditing(task)}
                                className="text-[#6B5C4D] hover:text-[#2F241A] font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-red-600 hover:text-red-800 font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
