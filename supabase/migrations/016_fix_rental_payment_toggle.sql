-- Fix rental payment toggle to only update rental_payments table
-- Remove incorrect expense_splits modification behavior

-- Drop and recreate the toggle_rental_payment function with correct logic
DROP FUNCTION IF EXISTS public.toggle_rental_payment(UUID, BOOLEAN);

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
  v_current_user_id UUID;
  v_payment_user_id UUID;
  v_room_id UUID;
  v_expense_id UUID;
  v_user_share_cents INTEGER;
  v_is_admin BOOLEAN;
  v_result JSON;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get rental payment details
  SELECT room_id, user_id
  INTO v_room_id, v_payment_user_id
  FROM public.rental_payments
  WHERE id = p_payment_id;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Rental payment not found';
  END IF;

  -- Check if current user is room admin
  SELECT owner_id = v_current_user_id
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

  -- Get the user's share from expense_splits (this is the source of truth for the share amount)
  SELECT amount_cents INTO v_user_share_cents
  FROM public.expense_splits
  WHERE expense_id = v_expense_id
    AND user_id = v_payment_user_id;

  IF v_user_share_cents IS NULL THEN
    RAISE EXCEPTION 'No expense split found for this user';
  END IF;

  -- Update rental payment status ONLY
  -- Do NOT modify expense_splits - that table holds the share amounts
  -- Always keep amount_cents synced with user's share from expense_splits
  UPDATE public.rental_payments
  SET
    paid = p_paid,
    amount_cents = v_user_share_cents,
    paid_at = CASE WHEN p_paid THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_payment_id;

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
'Atomically toggles rental payment status. Only modifies rental_payments table. expense_splits remains the source of truth for share amounts. Updates paid status and syncs amount_cents with user share from expense_splits.';
