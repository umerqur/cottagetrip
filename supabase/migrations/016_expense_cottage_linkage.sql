-- Add cottage_id to expenses table to link cottage rental expenses to selected cottage
-- This eliminates fragile price-based comparison logic

alter table public.expenses
add column if not exists cottage_id uuid references public.cottages(id);

update public.expenses e
set cottage_id = rs.cottage_id
from public.room_selections rs
where e.room_id = rs.room_id
  and e.is_cottage_rental = true
  and e.pinned = true;

create index if not exists expenses_cottage_id_idx
on public.expenses(cottage_id)
where cottage_id is not null;

-- Update RPC function to support cottage_id parameter
CREATE OR REPLACE FUNCTION public.upsert_expense_with_splits(
  p_expense_id UUID,
  p_room_id UUID,
  p_title TEXT,
  p_amount_cents INTEGER,
  p_paid_by_user_id UUID,
  p_selected_member_ids UUID[],
  p_receipt_path TEXT,
  p_is_cottage_rental BOOLEAN DEFAULT false,
  p_pinned BOOLEAN DEFAULT false,
  p_cottage_id UUID DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_is_room_member BOOLEAN;
  v_is_room_admin BOOLEAN;
  v_is_expense_creator BOOLEAN;
  v_expense_exists BOOLEAN;
  v_num_members INTEGER;
  v_base_amount INTEGER;
  v_remainder INTEGER;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is a room member
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = v_user_id
  ) INTO v_is_room_member;

  IF NOT v_is_room_member THEN
    RAISE EXCEPTION 'User is not a member of this room';
  END IF;

  -- Check if expense exists
  SELECT EXISTS (
    SELECT 1 FROM public.expenses WHERE id = p_expense_id
  ) INTO v_expense_exists;

  IF v_expense_exists THEN
    -- Updating existing expense
    -- Check if user is the expense creator
    SELECT created_by_user_id = v_user_id
    INTO v_is_expense_creator
    FROM public.expenses
    WHERE id = p_expense_id;

    -- Check if user is room admin
    SELECT owner_id = v_user_id
    INTO v_is_room_admin
    FROM public.rooms
    WHERE id = p_room_id;

    -- User must be either creator or admin
    IF NOT (v_is_expense_creator OR v_is_room_admin) THEN
      RAISE EXCEPTION 'User does not have permission to update this expense';
    END IF;

    -- Update expense
    UPDATE public.expenses
    SET
      title = p_title,
      amount_cents = p_amount_cents,
      paid_by_user_id = p_paid_by_user_id,
      receipt_path = p_receipt_path,
      cottage_id = p_cottage_id,
      updated_at = now()
    WHERE id = p_expense_id;

    -- Delete old splits
    DELETE FROM public.expense_splits WHERE expense_id = p_expense_id;
  ELSE
    -- Creating new expense
    INSERT INTO public.expenses (
      id,
      room_id,
      title,
      amount_cents,
      currency,
      paid_by_user_id,
      created_by_user_id,
      receipt_path,
      is_cottage_rental,
      pinned,
      cottage_id
    ) VALUES (
      p_expense_id,
      p_room_id,
      p_title,
      p_amount_cents,
      'CAD',
      p_paid_by_user_id,
      v_user_id,
      p_receipt_path,
      p_is_cottage_rental,
      p_pinned,
      p_cottage_id
    );
  END IF;

  -- Calculate equal splits with fair remainder distribution
  v_num_members := array_length(p_selected_member_ids, 1);

  IF v_num_members IS NULL OR v_num_members = 0 THEN
    RAISE EXCEPTION 'At least one member must be selected';
  END IF;

  v_base_amount := p_amount_cents / v_num_members;
  v_remainder := p_amount_cents % v_num_members;

  -- Insert new splits
  -- First 'remainder' members get 1 extra cent
  INSERT INTO public.expense_splits (expense_id, user_id, amount_cents)
  SELECT
    p_expense_id,
    member_id,
    CASE
      WHEN row_num <= v_remainder THEN v_base_amount + 1
      ELSE v_base_amount
    END
  FROM (
    SELECT
      unnest(p_selected_member_ids) AS member_id,
      ROW_NUMBER() OVER () AS row_num
  ) AS members;

  -- Return the updated expense with splits
  SELECT json_build_object(
    'expense', row_to_json(e.*),
    'splits', COALESCE(
      (
        SELECT json_agg(row_to_json(s.*))
        FROM public.expense_splits s
        WHERE s.expense_id = p_expense_id
      ),
      '[]'::json
    )
  )
  INTO v_result
  FROM public.expenses e
  WHERE e.id = p_expense_id;

  RETURN v_result;
END;
$$;
