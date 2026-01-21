import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRoomByCode, getRoomMembers } from '../lib/rooms'
import { getCottagesByRoomId, addCottageWithImage, deleteCottage, type CottagePayload } from '../lib/cottages'
import { getVotesByRoom, toggleVote } from '../lib/votes'
import { getCottageImageUrl } from '../lib/storage'
import { getSupabase } from '../lib/supabase'
import { getProfilesByIds, type Profile } from '../lib/profiles'
import type { Room as RoomType, Cottage, RoomMember } from '../lib/supabase'
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
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([])
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([])
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map())
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)

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

    // Load cottages, members, and votes for this room
    loadCottages(roomData.id)
    loadMembers(roomData.id)
    loadVotes(roomData.id)
  }

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

  const isAdmin = currentUser?.id === room.owner_id

  return (
    <AppShell>
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        {/* Room Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Room</h1>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 border border-amber-200">
              <span className="text-sm font-mono font-semibold text-amber-900">{room.code}</span>
              <button
                onClick={handleCopyCode}
                className="text-amber-700 hover:text-amber-900 transition"
                title="Copy room code"
              >
                {copied ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                return (
                  <div
                    key={member.user_id}
                    className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-medium text-sm border-2 ${
                      isCurrent ? 'border-blue-500' : 'border-white'
                    }`}
                    title={displayName}
                  >
                    {displayName.charAt(0).toUpperCase()}
                    {isOwner && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full flex items-center justify-center border border-white">
                        <span className="text-xs">👑</span>
                      </div>
                    )}
                  </div>
                )
              })}
              {roomMembers.length > 6 && (
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-gray-700 font-medium text-xs border-2 border-white">
                  +{roomMembers.length - 6}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action Row */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!isAdmin}
            className={`rounded-lg px-6 py-3 font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isAdmin
                ? 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 active:bg-amber-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Create listing
          </button>
          {!isAdmin && (
            <p className="mt-2 text-sm text-gray-600">Only admins can add listings</p>
          )}
        </div>

        {/* Listings Grid */}
        {cottages.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-20 text-center">
            <div className="mb-4 text-6xl">🏡</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-600">
              {isAdmin ? 'Click "Create listing" to add your first cottage.' : 'Ask the admin to add some listings.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cottages.map((cottage) => {
              const imageUrl = cottage.image_path ? getCottageImageUrl(cottage.image_path) : null
              const voteCount = voteCounts.get(cottage.id) || 0
              const hasVoted = userVotes.has(cottage.id)

              return (
                <div
                  key={cottage.id}
                  className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-200">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={cottage.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Admin Menu */}
                    {isAdmin && (
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={() => handleDeleteCottage(cottage.id)}
                          className="rounded-full bg-white/90 backdrop-blur p-2 text-gray-700 hover:bg-white hover:text-red-600 transition shadow-sm"
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
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{cottage.name}</h3>

                    {/* Meta */}
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                      {cottage.sleeps && (
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Sleeps {cottage.sleeps}
                        </span>
                      )}
                      {cottage.price_per_night && (
                        <span className="font-semibold text-amber-700">
                          ${cottage.price_per_night}/night
                        </span>
                      )}
                    </div>

                    {/* URL */}
                    {cottage.url && (
                      <a
                        href={cottage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline mb-3 block truncate"
                      >
                        View listing →
                      </a>
                    )}

                    {/* Vote Button */}
                    <button
                      onClick={() => handleVoteToggle(cottage.id)}
                      disabled={!currentUser}
                      className={`w-full rounded-lg px-4 py-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        hasVoted
                          ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 active:bg-purple-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400 active:bg-gray-300'
                      } ${!currentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      </main>
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
    price_per_night: undefined,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    setSubmitting(true)
    setError(null)

    const { cottage, error: submitError } = await addCottageWithImage(
      roomId,
      formData,
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
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create Listing</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., Cozy Lakefront Cottage"
            />
          </div>

          {/* URL */}
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              URL (optional)
            </label>
            <input
              type="url"
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="https://www.airbnb.com/rooms/..."
            />
          </div>

          {/* Sleeps and Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sleeps" className="block text-sm font-medium text-gray-700 mb-2">
                Sleeps (optional)
              </label>
              <input
                type="number"
                id="sleeps"
                min="1"
                value={formData.sleeps || ''}
                onChange={(e) => setFormData({ ...formData, sleeps: e.target.value ? parseInt(e.target.value) : undefined })}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="4"
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price/night (optional)
              </label>
              <input
                type="number"
                id="price"
                min="0"
                value={formData.price_per_night || ''}
                onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value ? parseInt(e.target.value) : undefined })}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="200"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={submitting}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              className="rounded-lg px-6 py-2 font-medium text-gray-700 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || !formData.name.trim() || submitting}
              className="rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-700 transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed active:bg-amber-800"
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
