-- Expenses and Receipts Feature
-- Creates tables and policies for expense tracking with receipt management

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'CAD',
  paid_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  receipt_path TEXT NULL,
  is_cottage_rental BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_room_id_idx ON public.expenses(room_id);
CREATE INDEX IF NOT EXISTS expenses_is_cottage_rental_idx ON public.expenses(room_id, is_cottage_rental);

-- Create expense_splits table
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_splits_expense_id_idx ON public.expense_splits(expense_id);

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_expenses_updated_at ON public.expenses;
CREATE TRIGGER set_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Integrity enforcement for splits sum and receipt required
CREATE OR REPLACE FUNCTION public.enforce_expense_rules()
RETURNS TRIGGER AS $$
DECLARE
  total INTEGER;
  split_total INTEGER;
  is_rental BOOLEAN;
  rpath TEXT;
BEGIN
  -- Get expense details
  SELECT amount_cents, is_cottage_rental, receipt_path
    INTO total, is_rental, rpath
  FROM public.expenses
  WHERE id = COALESCE(NEW.expense_id, OLD.expense_id);

  -- Calculate split total
  SELECT COALESCE(SUM(amount_cents), 0)
    INTO split_total
  FROM public.expense_splits
  WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id);

  -- Verify splits sum equals expense amount
  IF split_total <> total THEN
    RAISE EXCEPTION 'expense_splits must sum to expense amount';
  END IF;

  -- Verify receipt exists for non-cottage expenses
  IF is_rental = false AND (rpath IS NULL OR length(rpath) = 0) THEN
    RAISE EXCEPTION 'receipt_path required for non cottage expenses';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_expense_rules ON public.expense_splits;
CREATE TRIGGER trg_enforce_expense_rules
AFTER INSERT OR UPDATE OR DELETE ON public.expense_splits
FOR EACH STATEMENT EXECUTE FUNCTION public.enforce_expense_rules();

-- Enforce receipt rule on expense insert or update
CREATE OR REPLACE FUNCTION public.enforce_expense_receipt_rule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_cottage_rental = false AND (NEW.receipt_path IS NULL OR length(NEW.receipt_path) = 0) THEN
    RAISE EXCEPTION 'receipt_path required for non cottage expenses';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_expense_receipt_rule ON public.expenses;
CREATE TRIGGER trg_enforce_expense_receipt_rule
BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.enforce_expense_receipt_rule();

-- Unique partial index: only one pinned cottage rental per room
CREATE UNIQUE INDEX IF NOT EXISTS one_cottage_rental_per_room
ON public.expenses(room_id)
WHERE is_cottage_rental = true AND pinned = true;

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- RLS for expenses
CREATE POLICY "expenses readable by room members"
ON public.expenses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = expenses.room_id
      AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "members can create expenses"
ON public.expenses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = expenses.room_id
      AND rm.user_id = auth.uid()
  )
  AND created_by_user_id = auth.uid()
);

CREATE POLICY "creator can update own expenses"
ON public.expenses FOR UPDATE
USING (created_by_user_id = auth.uid())
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "admin can update any expense"
ON public.expenses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = expenses.room_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (TRUE);

-- Only admin can update cottage rental expenses
CREATE POLICY "only admin can update cottage rental expenses"
ON public.expenses FOR UPDATE
USING (
  is_cottage_rental = false
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = expenses.room_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "creator can delete own expenses"
ON public.expenses FOR DELETE
USING (created_by_user_id = auth.uid());

CREATE POLICY "admin can delete any expense"
ON public.expenses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = expenses.room_id
      AND r.owner_id = auth.uid()
  )
);

-- RLS for expense_splits
CREATE POLICY "expense_splits readable by room members"
ON public.expense_splits FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    JOIN public.room_members rm ON rm.room_id = e.room_id
    WHERE e.id = expense_splits.expense_id
      AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "members can manage splits for expenses they can edit"
ON public.expense_splits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = expense_splits.expense_id
      AND (
        e.created_by_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.rooms r
          WHERE r.id = e.room_id AND r.owner_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "members can update splits for expenses they can edit"
ON public.expense_splits FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = expense_splits.expense_id
      AND (
        e.created_by_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.rooms r
          WHERE r.id = e.room_id AND r.owner_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "members can delete splits for expenses they can edit"
ON public.expense_splits FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = expense_splits.expense_id
      AND (
        e.created_by_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.rooms r
          WHERE r.id = e.room_id AND r.owner_id = auth.uid()
        )
      )
  )
);
