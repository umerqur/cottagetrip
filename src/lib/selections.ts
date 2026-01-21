import { getSupabase, RoomSelection } from './supabase'

const SUPABASE_ERROR_MESSAGE = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'

/**
 * Gets the selected cottage for a room
 * @param roomId - The room ID
 * @returns The room selection or null if not found
 */
export async function getRoomSelection(roomId: string): Promise<{ selection: RoomSelection | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { selection: null, error: SUPABASE_ERROR_MESSAGE }
    }

    const { data, error } = await supabase
      .from('room_selections')
      .select('*')
      .eq('room_id', roomId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - no selection made yet
        return { selection: null, error: null }
      }
      console.error('Error fetching room selection:', error)
      return { selection: null, error: error.message }
    }

    return { selection: data, error: null }
  } catch (err) {
    console.error('Unexpected error fetching room selection:', err)
    return { selection: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Selects a cottage for a room (admin only)
 * Uses direct insert with RLS enforcement
 * @param roomId - The room ID
 * @param cottageId - The cottage ID to select
 * @returns The created/updated selection or null if error
 */
export async function selectCottage(
  roomId: string,
  cottageId: string
): Promise<{ selection: RoomSelection | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { selection: null, error: SUPABASE_ERROR_MESSAGE }
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { selection: null, error: 'User not authenticated' }
    }

    // Upsert the selection - RLS will enforce admin-only access
    const { data, error } = await supabase
      .from('room_selections')
      .upsert(
        {
          room_id: roomId,
          cottage_id: cottageId,
          selected_by: user.id,
          selected_at: new Date().toISOString()
        },
        {
          onConflict: 'room_id'
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error selecting cottage:', error)
      return { selection: null, error: error.message }
    }

    return { selection: data, error: null }
  } catch (err) {
    console.error('Unexpected error selecting cottage:', err)
    return { selection: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Removes the cottage selection for a room (admin only)
 * @param roomId - The room ID
 * @returns Success status
 */
export async function clearRoomSelection(roomId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, error: SUPABASE_ERROR_MESSAGE }
    }

    const { error } = await supabase
      .from('room_selections')
      .delete()
      .eq('room_id', roomId)

    if (error) {
      console.error('Error clearing room selection:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Unexpected error clearing room selection:', err)
    return { success: false, error: 'Unexpected error occurred' }
  }
}
