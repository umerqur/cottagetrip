import { getSupabase } from './supabase'

const SUPABASE_ERROR_MESSAGE = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'

export type TripDates = {
  trip_start_date: string | null
  trip_end_date: string | null
}

/**
 * Gets the trip dates for a room
 * @param roomId - The room ID
 * @returns The trip dates or null values if not set
 */
export async function getTripDates(roomId: string): Promise<{ dates: TripDates | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { dates: null, error: SUPABASE_ERROR_MESSAGE }
    }

    const { data, error } = await supabase
      .from('rooms')
      .select('trip_start_date, trip_end_date')
      .eq('id', roomId)
      .single()

    if (error) {
      console.error('Error fetching trip dates:', error)
      return { dates: null, error: error.message }
    }

    return { dates: data, error: null }
  } catch (err) {
    console.error('Unexpected error fetching trip dates:', err)
    return { dates: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Updates the trip dates for a room (admin only)
 * @param roomId - The room ID
 * @param startDate - Trip start date (YYYY-MM-DD format)
 * @param endDate - Trip end date (YYYY-MM-DD format)
 * @returns Success status with updated dates
 */
export async function updateTripDates(
  roomId: string,
  startDate: string | null,
  endDate: string | null
): Promise<{ dates: TripDates | null; error: string | null }> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { dates: null, error: SUPABASE_ERROR_MESSAGE }
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { dates: null, error: 'User not authenticated' }
    }

    // Update the trip dates - RLS will enforce admin-only access
    const { data, error } = await supabase
      .from('rooms')
      .update({
        trip_start_date: startDate,
        trip_end_date: endDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .select('trip_start_date, trip_end_date')
      .single()

    if (error) {
      console.error('Error updating trip dates:', error)
      return { dates: null, error: error.message }
    }

    return { dates: data, error: null }
  } catch (err) {
    console.error('Unexpected error updating trip dates:', err)
    return { dates: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Validates that trip dates are set and valid (end date after start date)
 * @param startDate - Trip start date
 * @param endDate - Trip end date
 * @returns Validation result with error message if invalid
 */
export function validateTripDates(
  startDate: string | null,
  endDate: string | null
): { valid: boolean; error: string | null } {
  if (!startDate || !endDate) {
    return {
      valid: false,
      error: 'Both trip start and end dates are required before selecting a cottage'
    }
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end <= start) {
    return {
      valid: false,
      error: 'Trip end date must be after start date'
    }
  }

  return { valid: true, error: null }
}
