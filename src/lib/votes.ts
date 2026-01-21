import { getSupabase } from './supabase'
import type { Vote } from './supabase'

const SUPABASE_ERROR_MESSAGE = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'

export type VoteCount = {
  cottage_id: string
  count: number
}

export async function getVotesByRoom(roomId: string): Promise<{
  votes: Vote[] | null
  voteCounts: Map<string, number>
  userVotes: Set<string>
  error: string | null
}> {
  const supabase = getSupabase()
  if (!supabase) {
    return {
      votes: null,
      voteCounts: new Map(),
      userVotes: new Set(),
      error: SUPABASE_ERROR_MESSAGE
    }
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('room_id', roomId)
    .eq('vote', 1)

  if (error) {
    console.error('Error fetching votes:', error)
    return {
      votes: null,
      voteCounts: new Map(),
      userVotes: new Set(),
      error: error.message
    }
  }

  const votes = data as Vote[]
  const voteCounts = new Map<string, number>()
  const userVotes = new Set<string>()

  votes.forEach(vote => {
    // Count votes per cottage
    voteCounts.set(vote.cottage_id, (voteCounts.get(vote.cottage_id) || 0) + 1)

    // Track current user's votes
    if (user && vote.user_id === user.id) {
      userVotes.add(vote.cottage_id)
    }
  })

  return { votes, voteCounts, userVotes, error: null }
}

export async function toggleVote(
  roomId: string,
  cottageId: string,
  userId: string
): Promise<{
  voteCounts: Map<string, number>
  userVotes: Set<string>
  error: string | null
}> {
  const supabase = getSupabase()
  if (!supabase) {
    return {
      voteCounts: new Map(),
      userVotes: new Set(),
      error: SUPABASE_ERROR_MESSAGE
    }
  }

  // Check if user already voted for this cottage
  const { data: existingVote } = await supabase
    .from('votes')
    .select('*')
    .eq('room_id', roomId)
    .eq('cottage_id', cottageId)
    .eq('user_id', userId)
    .eq('vote', 1)
    .maybeSingle()

  if (existingVote) {
    // Remove vote
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('id', existingVote.id)

    if (deleteError) {
      console.error('Error removing vote:', deleteError)
      return {
        voteCounts: new Map(),
        userVotes: new Set(),
        error: deleteError.message
      }
    }
  } else {
    // Add vote
    const { error: insertError } = await supabase
      .from('votes')
      .insert({
        room_id: roomId,
        cottage_id: cottageId,
        user_id: userId,
        vote: 1,
      })

    if (insertError) {
      console.error('Error adding vote:', insertError)
      return {
        voteCounts: new Map(),
        userVotes: new Set(),
        error: insertError.message
      }
    }
  }

  // Fetch updated vote counts
  const result = await getVotesByRoom(roomId)
  return {
    voteCounts: result.voteCounts,
    userVotes: result.userVotes,
    error: result.error,
  }
}
