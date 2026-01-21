-- Update RLS policies to allow room admin to update and delete any cottage in their room
-- Previously, users could only update/delete cottages they created

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own cottages" ON cottages;

-- Create new UPDATE policy: Room admin can update any cottage in their room
CREATE POLICY "Room admin can update cottages"
  ON cottages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = cottages.room_id
      AND rooms.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = cottages.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete their own cottages" ON cottages;

-- Create new DELETE policy: Room admin can delete any cottage in their room
CREATE POLICY "Room admin can delete cottages"
  ON cottages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = cottages.room_id
      AND rooms.owner_id = auth.uid()
    )
  );
