-- Task Completion Feature
-- Adds completion tracking to room_tasks with nuanced permissions

-- Add completion columns to room_tasks
ALTER TABLE public.room_tasks
ADD COLUMN IF NOT EXISTS done BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS done_by_user_id UUID NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ NULL;

-- SQL RPC function for toggling task completion
-- This enforces the business rules:
-- - If task is assigned: only assignee can toggle done
-- - If task is unassigned: only admin can toggle done
-- - Admin can always toggle done
CREATE OR REPLACE FUNCTION public.toggle_task_done(
  task_id UUID,
  new_done BOOLEAN
)
RETURNS TABLE (
  id UUID,
  room_id UUID,
  task_name TEXT,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  done BOOLEAN,
  done_by_user_id UUID,
  done_at TIMESTAMPTZ
) AS $$
DECLARE
  current_user_id UUID;
  task_room_id UUID;
  task_assigned_to UUID;
  is_admin BOOLEAN;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Fetch task details
  SELECT rt.room_id, rt.assigned_to INTO task_room_id, task_assigned_to
  FROM public.room_tasks rt
  WHERE rt.id = task_id;

  IF task_room_id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Check if current user is admin for this room
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = task_room_id
      AND r.owner_id = current_user_id
  ) INTO is_admin;

  -- Enforce permissions
  IF task_assigned_to IS NULL THEN
    -- Unassigned task: only admin can toggle
    IF NOT is_admin THEN
      RAISE EXCEPTION 'Only admin can toggle completion for unassigned tasks';
    END IF;
  ELSE
    -- Assigned task: assignee or admin can toggle
    IF NOT (is_admin OR current_user_id = task_assigned_to) THEN
      RAISE EXCEPTION 'Only the assignee or admin can toggle completion for this task';
    END IF;
  END IF;

  -- Update task
  UPDATE public.room_tasks
  SET
    done = new_done,
    done_by_user_id = CASE WHEN new_done THEN current_user_id ELSE NULL END,
    done_at = CASE WHEN new_done THEN now() ELSE NULL END,
    updated_at = now()
  WHERE room_tasks.id = task_id;

  -- Return updated task
  RETURN QUERY
  SELECT rt.id, rt.room_id, rt.task_name, rt.assigned_to, rt.created_by,
         rt.created_at, rt.updated_at, rt.done, rt.done_by_user_id, rt.done_at
  FROM public.room_tasks rt
  WHERE rt.id = task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
