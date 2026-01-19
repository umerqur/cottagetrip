import { supabase } from './supabase'
import type { Cottage } from './supabase'

export async function getCottagesByRoomId(roomId: string) {
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
