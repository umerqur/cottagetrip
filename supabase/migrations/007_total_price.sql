-- Add total_price column to cottages table
-- Replace price_per_night with total_price for trip pricing

-- Add total_price column
ALTER TABLE cottages
  ADD COLUMN IF NOT EXISTS total_price INT;

-- Optional backfill: set total_price = price_per_night where total_price is null
-- This helps preserve existing data during transition
UPDATE cottages
SET total_price = price_per_night
WHERE total_price IS NULL AND price_per_night IS NOT NULL;

-- Note: We keep price_per_night column for now (legacy field)
-- It will be deprecated in the application but not dropped from database yet
