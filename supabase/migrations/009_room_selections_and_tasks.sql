-- Room Selections Table
-- Stores which cottage has been selected for each room (one per room)
CREATE TABLE IF NOT EXISTS room_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  cottage_id UUID NOT NULL REFERENCES cottages(id) ON DELETE CASCADE,
  selected_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_room_selection UNIQUE (room_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_room_selections_room_id ON room_selections(room_id);
CREATE INDEX IF NOT EXISTS idx_room_selections_cottage_id ON room_selections(cottage_id);

-- Room Tasks Table
-- Stores tasks/assignments for a room after cottage selection
CREATE TABLE IF NOT EXISTS room_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_room_tasks_room_id ON room_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_room_tasks_assigned_to ON room_tasks(assigned_to);

-- RLS Policies for room_selections

-- Enable RLS
ALTER TABLE room_selections ENABLE ROW LEVEL SECURITY;

-- Users can view selections for rooms they're members of
CREATE POLICY "Users can view room selections for their rooms"
  ON room_selections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = room_selections.room_id
      AND room_members.user_id = auth.uid()
    )
  );

-- Only room admin can insert/update/delete selections
CREATE POLICY "Room admin can insert selections"
  ON room_selections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_selections.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Room admin can update selections"
  ON room_selections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_selections.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Room admin can delete selections"
  ON room_selections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_selections.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

-- RLS Policies for room_tasks

-- Enable RLS
ALTER TABLE room_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks for rooms they're members of
CREATE POLICY "Users can view room tasks for their rooms"
  ON room_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = room_tasks.room_id
      AND room_members.user_id = auth.uid()
    )
  );

-- Only room admin can insert/update/delete tasks
CREATE POLICY "Room admin can insert tasks"
  ON room_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_tasks.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Room admin can update tasks"
  ON room_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_tasks.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Room admin can delete tasks"
  ON room_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_tasks.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

-- RPC function to select a cottage for a room
CREATE OR REPLACE FUNCTION select_cottage(
  p_room_id UUID,
  p_cottage_id UUID
)
RETURNS room_selections
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_selection room_selections;
BEGIN
  -- Check if user is room admin
  IF NOT EXISTS (
    SELECT 1 FROM rooms
    WHERE id = p_room_id
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only room admin can select cottage';
  END IF;

  -- Check if cottage belongs to the room
  IF NOT EXISTS (
    SELECT 1 FROM cottages
    WHERE id = p_cottage_id
    AND room_id = p_room_id
  ) THEN
    RAISE EXCEPTION 'Cottage does not belong to this room';
  END IF;

  -- Insert or update the selection (upsert)
  INSERT INTO room_selections (room_id, cottage_id, selected_by)
  VALUES (p_room_id, p_cottage_id, auth.uid())
  ON CONFLICT (room_id)
  DO UPDATE SET
    cottage_id = p_cottage_id,
    selected_by = auth.uid(),
    selected_at = NOW()
  RETURNING * INTO v_selection;

  RETURN v_selection;
END;
$$;
