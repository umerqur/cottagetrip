import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let initialized = false

/**
 * Lazy getter for Supabase client
 * Returns null if environment variables are not configured
 * Never throws - safe to use at module load
 */
export function getSupabase(): SupabaseClient | null {
  if (initialized) {
    return supabaseInstance
  }

  initialized = true

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured')
    return null
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    return supabaseInstance
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

export type Room = {
  id: string
  code: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type RoomMember = {
  id: string
  room_id: string
  user_id: string
  joined_at: string
}

export type Cottage = {
  id: string
  room_id: string
  name: string
  description: string | null
  url: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type Vote = {
  id: string
  room_id: string
  cottage_id: string
  user_id: string
  vote: 0 | 1
  created_at: string
  updated_at: string
}
