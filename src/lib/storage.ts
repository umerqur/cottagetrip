import { getSupabase } from './supabase'

const SUPABASE_ERROR_MESSAGE = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify and redeploy.'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadCottageImage(
  roomId: string,
  cottageId: string,
  file: File
): Promise<{ image_path: string | null; error: string | null }> {
  const supabase = getSupabase()
  if (!supabase) {
    return { image_path: null, error: SUPABASE_ERROR_MESSAGE }
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { image_path: null, error: 'File must be an image' }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { image_path: null, error: 'Image must be less than 5MB' }
  }

  // Generate file path: {room_id}/{cottage_id}/{filename}
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${roomId}/${cottageId}/${fileName}`

  try {
    const { data, error } = await supabase.storage
      .from('cottage_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading image:', error)
      return { image_path: null, error: error.message }
    }

    return { image_path: data.path, error: null }
  } catch (err) {
    console.error('Unexpected error uploading image:', err)
    return { image_path: null, error: 'Failed to upload image' }
  }
}

export function getCottageImageUrl(imagePath: string): string | null {
  const supabase = getSupabase()
  if (!supabase) {
    return null
  }

  const { data } = supabase.storage
    .from('cottage_images')
    .getPublicUrl(imagePath)

  return data.publicUrl
}
