-- Rental Payments Tracking
-- Tracks per-member cottage rental payment status separate from expense splits
-- When paid = true, corresponding expense_split.amount_cents is set to 0

-- Create rental_payments table
CREATE TABLE IF NOT EXISTS public.rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_rental_payment_per_user UNIQUE (room_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS rental_payments_room_id_idx ON public.rental_payments(room_id);
CREATE INDEX IF NOT EXISTS rental_payments_user_id_idx ON public.rental_payments(user_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_rental_payments_updated_at ON public.rental_payments;
CREATE TRIGGER set_rental_payments_updated_at
BEFORE UPDATE ON public.rental_payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Members can view rental payments for their rooms
CREATE POLICY "rental_payments readable by room members"
ON public.rental_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = rental_payments.room_id
      AND rm.user_id = auth.uid()
  )
);

-- Only admins can insert rental payments
CREATE POLICY "admins can create rental payments"
ON public.rental_payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = rental_payments.room_id
      AND r.owner_id = auth.uid()
  )
);

-- Only admins can update rental payments
CREATE POLICY "admins can update rental payments"
ON public.rental_payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = rental_payments.room_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = rental_payments.room_id
      AND r.owner_id = auth.uid()
  )
);

-- Only admins can delete rental payments
CREATE POLICY "admins can delete rental payments"
ON public.rental_payments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = rental_payments.room_id
      AND r.owner_id = auth.uid()
  )
);

-- Atomic function to toggle rental payment and sync expense_split
CREATE OR REPLACE FUNCTION public.toggle_rental_payment(
  p_payment_id UUID,
  p_paid BOOLEAN
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_room_id UUID;
  v_amount_cents INTEGER;
  v_expense_id UUID;
  v_split_id UUID;
  v_is_admin BOOLEAN;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get rental payment details
  SELECT room_id, user_id, amount_cents
  INTO v_room_id, v_user_id, v_amount_cents
  FROM public.rental_payments
  WHERE id = p_payment_id;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Rental payment not found';
  END IF;

  -- Check if current user is room admin
  SELECT owner_id = auth.uid()
  INTO v_is_admin
  FROM public.rooms
  WHERE id = v_room_id;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only room admin can update rental payments';
  END IF;

  -- Get the pinned cottage rental expense for this room
  SELECT id INTO v_expense_id
  FROM public.expenses
  WHERE room_id = v_room_id
    AND is_cottage_rental = true
    AND pinned = true
  LIMIT 1;

  IF v_expense_id IS NULL THEN
    RAISE EXCEPTION 'No pinned cottage rental expense found';
  END IF;

  -- Get the expense_split for this user
  SELECT id INTO v_split_id
  FROM public.expense_splits
  WHERE expense_id = v_expense_id
    AND user_id = v_user_id;

  IF v_split_id IS NULL THEN
    RAISE EXCEPTION 'No expense split found for this user';
  END IF;

  -- Update rental payment status
  UPDATE public.rental_payments
  SET
    paid = p_paid,
    paid_at = CASE WHEN p_paid THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_payment_id;

  -- Update expense_split based on payment status
  IF p_paid THEN
    -- Set split to 0 when marked as paid
    UPDATE public.expense_splits
    SET amount_cents = 0
    WHERE id = v_split_id;
  ELSE
    -- Restore original amount from rental_payments when marked as unpaid
    UPDATE public.expense_splits
    SET amount_cents = v_amount_cents
    WHERE id = v_split_id;
  END IF;

  -- Return updated payment
  SELECT json_build_object(
    'payment', row_to_json(rp.*)
  )
  INTO v_result
  FROM public.rental_payments rp
  WHERE rp.id = p_payment_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_rental_payment TO authenticated;

COMMENT ON FUNCTION public.toggle_rental_payment IS
'Atomically toggles rental payment status and syncs the corresponding expense_split. When paid=true, sets split to 0. When paid=false, restores original amount.';
