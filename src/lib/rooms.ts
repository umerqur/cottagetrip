import { supabase, Room } from './supabase'

/**
 * Creates a new room with the current user as owner
 * Automatically adds the owner as a room member
 * @returns The created room or null if error
 */
export async function createRoom(): Promise<{ room: Room | null; error: string | null }> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { room: null, error: 'User not authenticated' }
    }

    // Call the database function to create room with membership
    const { data, error } = await supabase.rpc('create_room_with_membership')

    if (error) {
      console.error('Error creating room:', error)
      return { room: null, error: error.message }
    }

    if (!data || data.length === 0) {
      return { room: null, error: 'Failed to create room' }
    }

    // The RPC function returns an array with one element
    const roomData = data[0]

    return {
      room: {
        id: roomData.room_id,
        code: roomData.room_code,
        owner_id: roomData.owner_id,
        created_at: roomData.created_at,
        updated_at: roomData.created_at
      },
      error: null
    }
  } catch (err) {
    console.error('Unexpected error creating room:', err)
    return { room: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Gets a room by its code
 * @param code - The room code to look up
 * @returns The room or null if not found
 */
export async function getRoomByCode(code: string): Promise<{ room: Room | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return { room: null, error: 'Room not found' }
      }
      console.error('Error fetching room:', error)
      return { room: null, error: error.message }
    }

    return { room: data, error: null }
  } catch (err) {
    console.error('Unexpected error fetching room:', err)
    return { room: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Joins a room by code
 * Adds the current user as a member of the room
 * @param code - The room code to join
 * @returns The room if successfully joined, or null if error
 */
export async function joinRoomByCode(code: string): Promise<{ room: Room | null; error: string | null }> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { room: null, error: 'User not authenticated' }
    }

    // First, get the room by code
    const { room, error: roomError } = await getRoomByCode(code)

    if (roomError || !room) {
      return { room: null, error: roomError || 'Room not found' }
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single()

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error('Error checking membership:', memberCheckError)
      return { room: null, error: memberCheckError.message }
    }

    // If already a member, return the room
    if (existingMember) {
      return { room, error: null }
    }

    // Add user as a member
    const { error: insertError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id
      })

    if (insertError) {
      console.error('Error joining room:', insertError)
      return { room: null, error: insertError.message }
    }

    return { room, error: null }
  } catch (err) {
    console.error('Unexpected error joining room:', err)
    return { room: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Gets all members of a room
 * @param roomId - The room ID
 * @returns Array of room members
 */
export async function getRoomMembers(roomId: string) {
  try {
    const { data, error } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching room members:', error)
      return { members: [], error: error.message }
    }

    return { members: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error fetching room members:', err)
    return { members: [], error: 'Unexpected error occurred' }
  }
}
