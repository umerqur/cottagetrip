-- Phase 2A: Cottages Images and Metadata
-- Add image support, metadata fields, and storage bucket for listing images

-- Add columns to cottages table
ALTER TABLE cottages
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS sleeps INT,
  ADD COLUMN IF NOT EXISTS price_per_night INT;

-- Make image_path required for new rows (existing rows can be NULL temporarily)
-- We'll handle this with application logic during the transition

-- Update RLS policy for cottages INSERT to require user is room owner
-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can create cottages in their rooms" ON cottages;

-- Create new policy: Only room owner (admin) can insert cottages
CREATE POLICY "Only room admin can create cottages"
  ON cottages
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = cottages.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

-- Create storage bucket for cottage images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cottage_images', 'cottage_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cottage_images bucket
-- Policy: Public read access
CREATE POLICY "Public read access for cottage images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'cottage_images');

-- Policy: Only room admin can upload images to their room's folder
CREATE POLICY "Room admin can upload cottage images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cottage_images'
    AND (storage.foldername(name))[1] IN (
      SELECT rooms.id::text
      FROM rooms
      WHERE rooms.owner_id = auth.uid()
    )
  );

-- Policy: Only room admin can update images in their room's folder
CREATE POLICY "Room admin can update cottage images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'cottage_images'
    AND (storage.foldername(name))[1] IN (
      SELECT rooms.id::text
      FROM rooms
      WHERE rooms.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'cottage_images'
    AND (storage.foldername(name))[1] IN (
      SELECT rooms.id::text
      FROM rooms
      WHERE rooms.owner_id = auth.uid()
    )
  );

-- Policy: Only room admin can delete images in their room's folder
CREATE POLICY "Room admin can delete cottage images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cottage_images'
    AND (storage.foldername(name))[1] IN (
      SELECT rooms.id::text
      FROM rooms
      WHERE rooms.owner_id = auth.uid()
    )
  );

-- Update updated_at trigger for cottages if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cottages_updated_at ON cottages;
CREATE TRIGGER update_cottages_updated_at
  BEFORE UPDATE ON cottages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
