-- Storage Security: Make cottage_images bucket private and add member-gated policies
-- This migration removes public read access and requires authentication

-- Drop the existing public read policy
DROP POLICY IF EXISTS "Public read access for cottage images" ON storage.objects;

-- Create member-only SELECT policy for cottage_images bucket
-- Users can view objects in rooms they are members of
CREATE POLICY "Room members can view cottage images and receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cottage_images'
  AND (
    -- Extract room_id from path (first segment after bucket)
    -- Path format: {roomId}/{cottageId or 'receipts'}/{filename}
    (storage.foldername(name))[1] IN (
      SELECT rooms.id::text
      FROM public.rooms
      JOIN public.room_members ON room_members.room_id = rooms.id
      WHERE room_members.user_id = auth.uid()
    )
  )
);

-- Policy: Members can upload receipts to their room's receipts folder
CREATE POLICY "Room members can upload receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cottage_images'
  -- Path must start with rooms/{roomId}/receipts/
  AND name LIKE 'rooms/%/receipts/%'
  AND (
    -- Extract room_id from path (second segment: rooms/{roomId}/receipts/...)
    split_part(name, '/', 2) IN (
      SELECT rooms.id::text
      FROM public.rooms
      JOIN public.room_members ON room_members.room_id = rooms.id
      WHERE room_members.user_id = auth.uid()
    )
  )
);

-- Policy: Room admin or uploader can delete receipts
CREATE POLICY "Room admin or uploader can delete receipts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cottage_images'
  AND name LIKE 'rooms/%/receipts/%'
  AND (
    -- Room admin can delete
    split_part(name, '/', 2) IN (
      SELECT rooms.id::text
      FROM public.rooms
      WHERE rooms.owner_id = auth.uid()
    )
    -- OR file owner can delete (if owner column is set)
    OR owner = auth.uid()
  )
);

-- Update bucket to be non-public
UPDATE storage.buckets
SET public = false
WHERE id = 'cottage_images';
