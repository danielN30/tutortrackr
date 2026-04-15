
-- Add scheduling columns to sessions
ALTER TABLE public.sessions 
  ADD COLUMN start_time time,
  ADD COLUMN duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN status text NOT NULL DEFAULT 'scheduled';

-- Mark all existing sessions as completed
UPDATE public.sessions SET status = 'completed' WHERE status = 'scheduled';
