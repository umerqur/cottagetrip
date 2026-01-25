import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

console.log("notify_payment_reminder: boot")

const COOLDOWN_DAYS = 5

serve(async (req) => {
  const origin = req.headers.get("origin")

  const corsHeaders = {
    "Access-Control-Allow-Origin": origin ?? "https://cottagetrip.netlify.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!RESEND_API_KEY) {
    console.error("notify_payment_reminder: Missing RESEND_API_KEY")
    return new Response(
      JSON.stringify({ error: "Missing RESEND_API_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("notify_payment_reminder: Missing Supabase configuration")
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const resend = new Resend(RESEND_API_KEY)

    // Parse request body
    const { room_id, to_user_id, from_user_id, amount_cents } = await req.json()

    // Validate required fields
    if (!room_id || !to_user_id || !from_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: room_id, to_user_id, from_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate amount_cents > 0
    if (typeof amount_cents !== "number" || amount_cents <= 0) {
      return new Response(
        JSON.stringify({ error: "amount_cents must be greater than 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("notify_payment_reminder: Processing", { room_id, to_user_id, from_user_id, amount_cents })

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get auth user from request to verify they are the from_user and a room member
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create client with user's token to verify identity
    const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      console.error("notify_payment_reminder: Auth error", authError)
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify the authenticated user is the from_user
    if (user.id !== from_user_id) {
      return new Response(
        JSON.stringify({ error: "You can only send reminders on your own behalf" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify from_user is a member of the room
    const { data: membership, error: memberError } = await supabase
      .from("room_members")
      .select("user_id")
      .eq("room_id", room_id)
      .eq("user_id", from_user_id)
      .single()

    if (memberError || !membership) {
      console.error("notify_payment_reminder: Not a room member", memberError)
      return new Response(
        JSON.stringify({ error: "You are not a member of this room" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check cooldown and record reminder using the database function
    const { data: reminderResult, error: reminderError } = await supabase
      .rpc("check_and_record_payment_reminder", {
        p_room_id: room_id,
        p_from_user_id: from_user_id,
        p_to_user_id: to_user_id,
        p_reminder_type: "settlement",
        p_cooldown_days: COOLDOWN_DAYS
      })

    if (reminderError) {
      console.error("notify_payment_reminder: Reminder check error", reminderError)
      return new Response(
        JSON.stringify({ error: "Failed to check reminder status", details: reminderError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // If cooldown is active, return the timestamps without sending email
    if (!reminderResult.success) {
      console.log("notify_payment_reminder: Cooldown active", reminderResult)
      return new Response(
        JSON.stringify({
          success: false,
          error: "cooldown_active",
          message: "Reminder already sent recently",
          last_sent_at: reminderResult.last_sent_at,
          next_allowed_at: reminderResult.next_allowed_at
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Fetch recipient profile
    const { data: toProfile, error: toProfileError } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", to_user_id)
      .single()

    if (toProfileError || !toProfile) {
      console.error("notify_payment_reminder: Recipient profile not found", toProfileError)
      return new Response(
        JSON.stringify({ error: "Recipient profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate email
    const toEmail = toProfile.email
    if (!toEmail || !toEmail.includes("@")) {
      console.error("notify_payment_reminder: Invalid recipient email", toEmail)
      return new Response(
        JSON.stringify({ error: "Invalid email address for recipient" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Fetch room code for the link
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("code")
      .eq("id", room_id)
      .single()

    if (roomError || !room) {
      console.error("notify_payment_reminder: Room not found", roomError)
      return new Response(
        JSON.stringify({ error: "Room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Format amount
    const amountFormatted = `$${(amount_cents / 100).toFixed(2)}`
    const roomLink = `https://cottagetrip.netlify.app/room/${room.code}?tab=costs`
    const recipientName = toProfile.display_name || "there"

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "CottageTrip <notifications@cottagetrip.app>",
      to: toEmail,
      subject: "Friendly reminder about your cottage trip balance",
      html: `
        <p>Hi ${recipientName},</p>
        <p>Friendly reminder you still owe <strong>${amountFormatted}</strong> for the cottage trip.</p>
        <p style="margin: 24px 0;">
          <a href="${roomLink}" style="background-color: #78350f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Costs
          </a>
        </p>
        <p>Thanks,<br>The CottageTrip Team</p>
      `
    })

    if (emailError) {
      console.error("notify_payment_reminder: Email send error", emailError)
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("notify_payment_reminder: Email sent successfully", emailData)

    return new Response(
      JSON.stringify({
        success: true,
        message: "Reminder sent",
        email_id: emailData?.id,
        last_sent_at: reminderResult.last_sent_at,
        next_allowed_at: reminderResult.next_allowed_at
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("notify_payment_reminder: Unexpected error", error)
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
