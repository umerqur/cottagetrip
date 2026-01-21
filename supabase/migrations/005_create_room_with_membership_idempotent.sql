-- Fix room creation duplicate key constraint violation
-- Root cause: Database trigger trg_add_room_owner_as_member already inserts
-- owner into room_members after INSERT ON rooms. The RPC was redundantly
-- inserting the same membership, causing duplicate key violation.
-- Solution: Remove duplicate INSERT from RPC, let trigger handle it.

CREATE OR REPLACE FUNCTION create_room_with_membership()
RETURNS TABLE (
  room_id UUID,
  room_code TEXT,
  owner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  new_code TEXT;
  new_room_id UUID;
  code_exists BOOLEAN;
BEGIN
  -- Generate unique code
  LOOP
    new_code := generate_room_code();
    SELECT EXISTS(SELECT 1 FROM rooms WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Insert room
  -- Note: Database trigger trg_add_room_owner_as_member will automatically
  -- add the owner as a room member after this INSERT completes
  INSERT INTO rooms (code, owner_id)
  VALUES (new_code, auth.uid())
  RETURNING id INTO new_room_id;

  -- Removed: INSERT INTO room_members
  -- The trigger handles this automatically

  -- Return room details
  RETURN QUERY
  SELECT r.id as room_id, r.code as room_code, r.owner_id, r.created_at
  FROM rooms r
  WHERE r.id = new_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
