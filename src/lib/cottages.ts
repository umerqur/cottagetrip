import { getSupabase } from './supabase'
import type { Cottage } from './supabase'

const SUPABASE_ERROR_MESSAGE = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'

export async function getCottagesByRoomId(roomId: string) {
  const supabase = getSupabase()
  if (!supabase) {
    return { cottages: null, error: SUPABASE_ERROR_MESSAGE }
  }

  const { data, error } = await supabase
    .from('cottages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cottages:', error)
    return { cottages: null, error: error.message }
  }

  return { cottages: data as Cottage[], error: null }
}

export async function addCottage(
  roomId: string,
  url: string,
  userId: string
) {
  const supabase = getSupabase()
  if (!supabase) {
    return { cottage: null, error: SUPABASE_ERROR_MESSAGE }
  }

  const { data, error } = await supabase
    .from('cottages')
    .insert({
      room_id: roomId,
      name: 'Airbnb Cottage',
      url: url,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding cottage:', error)
    return { cottage: null, error: error.message }
  }

  return { cottage: data as Cottage, error: null }
}

export function extractAirbnbListingId(text: string): string | null {
  const regex = /\/rooms\/(\d+)/
  const match = text.match(regex)
  return match ? match[1] : null
}

export function buildCanonicalAirbnbUrl(listingId: string): string {
  return `https://www.airbnb.com/rooms/${listingId}`
}
