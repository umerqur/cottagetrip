import { getSupabase } from './supabase'

export interface Profile {
  id: string
  email: string
  display_name: string
  created_at: string
  updated_at: string
}

/**
 * Get user profile by user ID
 */
export async function getProfile(userId: string): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = getSupabase()
  if (!supabase) return { profile: null, error: 'Supabase not configured' }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // If profile doesn't exist, return null (not an error)
    if (error.code === 'PGRST116') {
      return { profile: null, error: null }
    }
    return { profile: null, error: error.message }
  }

  return { profile: data, error: null }
}

/**
 * Upsert (create or update) user profile
 */
export async function upsertProfile(
  userId: string,
  email: string,
  displayName: string
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = getSupabase()
  if (!supabase) return { profile: null, error: 'Supabase not configured' }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      display_name: displayName,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return { profile: null, error: error.message }
  }

  return { profile: data, error: null }
}

/**
 * Get profiles for a list of user IDs
 */
export async function getProfilesByIds(userIds: string[]): Promise<{ profiles: Profile[]; error: string | null }> {
  const supabase = getSupabase()
  if (!supabase) return { profiles: [], error: 'Supabase not configured' }

  if (userIds.length === 0) {
    return { profiles: [], error: null }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  if (error) {
    return { profiles: [], error: error.message }
  }

  return { profiles: data || [], error: null }
}
