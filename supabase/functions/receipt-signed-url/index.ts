import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Parse request body
    const { roomId, receiptPath } = await req.json()

    if (!roomId || !receiptPath) {
      return new Response(
        JSON.stringify({ error: 'Missing roomId or receiptPath' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify user is a member of the room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this room' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Verify receipt path starts with rooms/{roomId}/receipts/
    const expectedPrefix = `rooms/${roomId}/receipts/`
    if (!receiptPath.startsWith(expectedPrefix)) {
      return new Response(
        JSON.stringify({ error: 'Invalid receipt path' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Generate signed URL with 5 minute expiry
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('cottage_images')
      .createSignedUrl(receiptPath, 300) // 300 seconds = 5 minutes

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      return new Response(
        JSON.stringify({ error: 'Failed to create signed URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
