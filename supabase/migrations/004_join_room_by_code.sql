-- Add join_room_by_code RPC function
-- This function allows users to join a room by its code

CREATE OR REPLACE FUNCTION join_room_by_code(p_code TEXT)
RETURNS TABLE (
  room_id UUID,
  room_code TEXT,
  owner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_room_id UUID;
  v_user_id UUID;
  v_member_exists BOOLEAN;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Find the room by code
  SELECT id INTO v_room_id
  FROM rooms
  WHERE code = UPPER(p_code);

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  -- Check if user is already a member
  SELECT EXISTS(
    SELECT 1 FROM room_members
    WHERE room_id = v_room_id AND user_id = v_user_id
  ) INTO v_member_exists;

  -- Add user as member if not already
  IF NOT v_member_exists THEN
    INSERT INTO room_members (room_id, user_id)
    VALUES (v_room_id, v_user_id);
  END IF;

  -- Return room details
  RETURN QUERY
  SELECT r.id as room_id, r.code as room_code, r.owner_id, r.created_at, r.updated_at
  FROM rooms r
  WHERE r.id = v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
