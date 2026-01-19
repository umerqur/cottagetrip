-- Rooms MVP Migration
-- Create rooms and room_members tables with RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_members table
CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_owner_id ON rooms(owner_id);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- Rooms RLS Policies

-- Policy: Users can select rooms where they are a member
CREATE POLICY "Users can view rooms they are members of"
  ON rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = rooms.id
      AND room_members.user_id = auth.uid()
    )
  );

-- Policy: Users can insert room if they are the owner
CREATE POLICY "Users can create rooms as owner"
  ON rooms
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Room Members RLS Policies

-- Policy: Users can select room_members for rooms they belong to
CREATE POLICY "Users can view members of their rooms"
  ON room_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_members.room_id
      AND rm.user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own membership for a room they join
CREATE POLICY "Users can join rooms"
  ON room_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to generate a unique room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars (I, O, 1, 0)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a room with automatic membership
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
  INSERT INTO rooms (code, owner_id)
  VALUES (new_code, auth.uid())
  RETURNING id INTO new_room_id;

  -- Insert membership for owner
  INSERT INTO room_members (room_id, user_id)
  VALUES (new_room_id, auth.uid());

  -- Return room details
  RETURN QUERY
  SELECT r.id, r.code, r.owner_id, r.created_at
  FROM rooms r
  WHERE r.id = new_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
