-- Payment Reminders
-- Tracks when payment reminders are sent between users in a room
-- Enforces cooldown period (5 days) per room per creditor-debtor pair

-- Create payment_reminders table
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'settlement',
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One reminder record per room per creditor-debtor pair per type
  CONSTRAINT unique_reminder_per_pair_per_room_per_type
    UNIQUE (room_id, from_user_id, to_user_id, reminder_type)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS payment_reminders_room_id_idx
  ON public.payment_reminders(room_id);
CREATE INDEX IF NOT EXISTS payment_reminders_from_user_id_idx
  ON public.payment_reminders(from_user_id);
CREATE INDEX IF NOT EXISTS payment_reminders_to_user_id_idx
  ON public.payment_reminders(to_user_id);

-- Enable RLS
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Room members can view reminders in their rooms
CREATE POLICY "payment_reminders readable by room members"
ON public.payment_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = payment_reminders.room_id
      AND rm.user_id = auth.uid()
  )
);

-- Users can insert reminders where they are the sender (from_user)
CREATE POLICY "users can create reminders they send"
ON public.payment_reminders FOR INSERT
WITH CHECK (
  from_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = payment_reminders.room_id
      AND rm.user_id = auth.uid()
  )
);

-- Users can update reminders they sent
CREATE POLICY "users can update reminders they sent"
ON public.payment_reminders FOR UPDATE
USING (from_user_id = auth.uid())
WITH CHECK (from_user_id = auth.uid());

-- Users can delete reminders they sent
CREATE POLICY "users can delete reminders they sent"
ON public.payment_reminders FOR DELETE
USING (from_user_id = auth.uid());

-- Function to check and send payment reminder (called by Edge Function)
-- Returns JSON with success status, last_sent_at, and next_allowed_at
CREATE OR REPLACE FUNCTION public.check_and_record_payment_reminder(
  p_room_id UUID,
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_reminder_type TEXT DEFAULT 'settlement',
  p_cooldown_days INTEGER DEFAULT 5
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_reminder RECORD;
  v_cooldown_interval INTERVAL;
  v_next_allowed_at TIMESTAMPTZ;
  v_now TIMESTAMPTZ;
  v_result JSON;
BEGIN
  v_now := now();
  v_cooldown_interval := (p_cooldown_days || ' days')::INTERVAL;

  -- Check if reminder exists for this pair
  SELECT * INTO v_existing_reminder
  FROM public.payment_reminders
  WHERE room_id = p_room_id
    AND from_user_id = p_from_user_id
    AND to_user_id = p_to_user_id
    AND reminder_type = p_reminder_type;

  IF v_existing_reminder IS NOT NULL THEN
    -- Check cooldown
    v_next_allowed_at := v_existing_reminder.last_sent_at + v_cooldown_interval;

    IF v_now < v_next_allowed_at THEN
      -- Cooldown not expired
      RETURN json_build_object(
        'success', false,
        'error', 'cooldown_active',
        'last_sent_at', v_existing_reminder.last_sent_at,
        'next_allowed_at', v_next_allowed_at
      );
    END IF;

    -- Cooldown expired, update the record
    UPDATE public.payment_reminders
    SET last_sent_at = v_now
    WHERE id = v_existing_reminder.id;

    RETURN json_build_object(
      'success', true,
      'last_sent_at', v_now,
      'next_allowed_at', v_now + v_cooldown_interval
    );
  ELSE
    -- No existing reminder, create one
    INSERT INTO public.payment_reminders (room_id, from_user_id, to_user_id, reminder_type, last_sent_at)
    VALUES (p_room_id, p_from_user_id, p_to_user_id, p_reminder_type, v_now);

    RETURN json_build_object(
      'success', true,
      'last_sent_at', v_now,
      'next_allowed_at', v_now + v_cooldown_interval
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (Edge Function uses service role)
GRANT EXECUTE ON FUNCTION public.check_and_record_payment_reminder TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_payment_reminder TO service_role;

COMMENT ON FUNCTION public.check_and_record_payment_reminder IS
'Checks cooldown and records a payment reminder. Returns success status with timestamps. Used by notify_payment_reminder Edge Function.';
