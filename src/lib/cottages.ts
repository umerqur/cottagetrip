import { getSupabase } from './supabase'
import type { Cottage } from './supabase'
import { uploadCottageImage } from './storage'

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

export type CottagePayload = {
  name: string
  description?: string
  url?: string
  sleeps?: number
  price_per_night?: number
}

export async function addCottageWithImage(
  roomId: string,
  payload: CottagePayload,
  file: File,
  userId: string
): Promise<{ cottage: Cottage | null; error: string | null }> {
  const supabase = getSupabase()
  if (!supabase) {
    return { cottage: null, error: SUPABASE_ERROR_MESSAGE }
  }

  // Create cottage with placeholder image_path first
  const { data: cottage, error: insertError } = await supabase
    .from('cottages')
    .insert({
      room_id: roomId,
      name: payload.name,
      description: payload.description || null,
      url: payload.url || null,
      sleeps: payload.sleeps || null,
      price_per_night: payload.price_per_night || null,
      image_path: 'placeholder', // Temporary value
      created_by: userId,
    })
    .select()
    .single()

  if (insertError || !cottage) {
    console.error('Error creating cottage:', insertError)
    return { cottage: null, error: insertError?.message || 'Failed to create cottage' }
  }

  // Upload image to storage
  const { image_path, error: uploadError } = await uploadCottageImage(
    roomId,
    cottage.id,
    file
  )

  if (uploadError || !image_path) {
    // Delete the cottage since we couldn't upload the image
    await supabase.from('cottages').delete().eq('id', cottage.id)
    return { cottage: null, error: uploadError || 'Failed to upload image' }
  }

  // Update cottage with final image_path
  const { data: updatedCottage, error: updateError } = await supabase
    .from('cottages')
    .update({ image_path })
    .eq('id', cottage.id)
    .select()
    .single()

  if (updateError || !updatedCottage) {
    console.error('Error updating cottage image path:', updateError)
    // Try to clean up the uploaded image
    await supabase.storage.from('cottage_images').remove([image_path])
    await supabase.from('cottages').delete().eq('id', cottage.id)
    return { cottage: null, error: updateError?.message || 'Failed to update cottage' }
  }

  return { cottage: updatedCottage as Cottage, error: null }
}

export async function deleteCottage(cottageId: string): Promise<{ error: string | null }> {
  const supabase = getSupabase()
  if (!supabase) {
    return { error: SUPABASE_ERROR_MESSAGE }
  }

  // Get cottage to find image_path
  const { data: cottage } = await supabase
    .from('cottages')
    .select('image_path')
    .eq('id', cottageId)
    .single()

  // Delete cottage (will cascade delete votes)
  const { error: deleteError } = await supabase
    .from('cottages')
    .delete()
    .eq('id', cottageId)

  if (deleteError) {
    console.error('Error deleting cottage:', deleteError)
    return { error: deleteError.message }
  }

  // Try to delete the image from storage (best effort)
  if (cottage?.image_path) {
    await supabase.storage
      .from('cottage_images')
      .remove([cottage.image_path])
      .catch(err => console.warn('Failed to delete image:', err))
  }

  return { error: null }
}
