import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
