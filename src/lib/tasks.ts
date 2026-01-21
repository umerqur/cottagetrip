import { getSupabase, RoomTask } from './supabase'

const SUPABASE_ERROR_MESSAGE = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'

/**
 * Gets all tasks for a room
 * @param roomId - The room ID
 * @returns Array of room tasks
 */
export async function getRoomTasks(roomId: string): Promise<{ tasks: RoomTask[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { tasks: [], error: SUPABASE_ERROR_MESSAGE }
    }

    const { data, error } = await supabase
      .from('room_tasks')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching room tasks:', error)
      return { tasks: [], error: error.message }
    }

    return { tasks: data || [], error: null }
  } catch (err) {
    console.error('Unexpected error fetching room tasks:', err)
    return { tasks: [], error: 'Unexpected error occurred' }
  }
}

/**
 * Creates a new task for a room (admin only)
 * @param roomId - The room ID
 * @param taskName - The name/description of the task
 * @param assignedTo - Optional user ID to assign the task to
 * @returns The created task or null if error
 */
export async function createRoomTask(
  roomId: string,
  taskName: string,
  assignedTo: string | null = null
): Promise<{ task: RoomTask | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { task: null, error: SUPABASE_ERROR_MESSAGE }
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { task: null, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('room_tasks')
      .insert({
        room_id: roomId,
        task_name: taskName,
        assigned_to: assignedTo,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating room task:', error)
      return { task: null, error: error.message }
    }

    return { task: data, error: null }
  } catch (err) {
    console.error('Unexpected error creating room task:', err)
    return { task: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Updates a room task (admin only)
 * @param taskId - The task ID
 * @param updates - Fields to update
 * @returns The updated task or null if error
 */
export async function updateRoomTask(
  taskId: string,
  updates: { task_name?: string; assigned_to?: string | null }
): Promise<{ task: RoomTask | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { task: null, error: SUPABASE_ERROR_MESSAGE }
    }

    const { data, error } = await supabase
      .from('room_tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error updating room task:', error)
      return { task: null, error: error.message }
    }

    return { task: data, error: null }
  } catch (err) {
    console.error('Unexpected error updating room task:', err)
    return { task: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Deletes a room task (admin only)
 * @param taskId - The task ID
 * @returns Success status
 */
export async function deleteRoomTask(taskId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, error: SUPABASE_ERROR_MESSAGE }
    }

    const { error } = await supabase
      .from('room_tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting room task:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Unexpected error deleting room task:', err)
    return { success: false, error: 'Unexpected error occurred' }
  }
}
