import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

console.log("notify_task_assigned: boot")

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

  // Read environment variables at runtime using Deno.env.get
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  console.log("notify_task_assigned: has RESEND_API_KEY", Boolean(RESEND_API_KEY))
  console.log("notify_task_assigned: has SUPABASE_URL", Boolean(SUPABASE_URL))
  console.log("notify_task_assigned: has SUPABASE_SERVICE_ROLE_KEY", Boolean(SUPABASE_SERVICE_ROLE_KEY))

  // Runtime guard: throw error if RESEND_API_KEY is missing
  if (!RESEND_API_KEY) {
    console.error("notify_task_assigned: Missing RESEND_API_KEY at runtime")
    return new Response(
      JSON.stringify({ error: "Missing RESEND_API_KEY at runtime" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("notify_task_assigned: Missing Supabase configuration")
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    // Initialize Resend client inside the function (not at module level)
    const resend = new Resend(RESEND_API_KEY)

    // Parse request body
    const { task_id } = await req.json()

    if (!task_id) {
      return new Response(
        JSON.stringify({ error: "Missing task_id in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("notify_task_assigned: task_id", task_id)

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch task details with room and assignee information
    const { data: task, error: taskError } = await supabase
      .from("room_tasks")
      .select(`
        id,
        task_name,
        assigned_to,
        room_id,
        rooms (
          code
        )
      `)
      .eq("id", task_id)
      .single()

    if (taskError) {
      console.error("notify_task_assigned: Database error fetching task", taskError)
      return new Response(
        JSON.stringify({ error: "Database error", details: taskError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!task) {
      console.error("notify_task_assigned: Task not found", task_id)
      return new Response(
        JSON.stringify({ error: "Task not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // If no one is assigned, skip notification
    if (!task.assigned_to) {
      console.log("notify_task_assigned: No assignee, skipping notification")
      return new Response(
        JSON.stringify({ message: "No assignee, skipping notification" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Fetch assignee profile with email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", task.assigned_to)
      .single()

    if (profileError || !profile) {
      console.error("notify_task_assigned: Error fetching profile", profileError)
      return new Response(
        JSON.stringify({ error: "Assignee profile not found", details: profileError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify that we have a valid email address
    const to = profile.email
    if (!to || !to.includes("@")) {
      console.error("notify_task_assigned: Invalid email address", to)
      return new Response(
        JSON.stringify({ error: "Invalid email address for assignee" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("notify_task_assigned: to", to)

    // Send email notification
    const roomName = task.rooms?.name || "Your Room"
    const roomCode = task.rooms?.code || "N/A"

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "CottageTrip <notifications@cottagetrip.app>",
      to: to,
      subject: `New Task Assigned: ${task.task_name}`,
      html: `
        <h2>You've been assigned a new task!</h2>
        <p>Hi ${profile.display_name},</p>
        <p>You've been assigned a task in <strong>${roomName}</strong> (Room code: ${roomCode}):</p>
        <h3>${task.task_name}</h3>
        <p>Visit your room to view details and manage your tasks.</p>
        <p>Thanks,<br>The CottageTrip Team</p>
      `
    })

    if (emailError) {
      console.error("notify_task_assigned: Error sending email", emailError)
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("notify_task_assigned: Email sent successfully", emailData)

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent",
        email_id: emailData?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("notify_task_assigned: Unexpected error", error)
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
