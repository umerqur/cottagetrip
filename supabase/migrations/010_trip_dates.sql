-- Migration: Add trip start and end dates to rooms table
-- Purpose: Allow admins to set trip dates that are required before locking a cottage as Selected

-- Add trip date columns to rooms table
ALTER TABLE rooms
ADD COLUMN trip_start_date DATE NULL,
ADD COLUMN trip_end_date DATE NULL;

-- Add comment for documentation
COMMENT ON COLUMN rooms.trip_start_date IS 'Start date of the trip (admin-only editable, required before final selection)';
COMMENT ON COLUMN rooms.trip_end_date IS 'End date of the trip (admin-only editable, required before final selection)';

-- RLS policies for trip dates
-- Note: The existing RLS policies on rooms table already handle admin-only updates
-- Specifically, the admin can update any column in their room via existing policies
-- Room members can view dates (SELECT already allowed)
-- This migration adds the columns; existing RLS policies automatically apply
