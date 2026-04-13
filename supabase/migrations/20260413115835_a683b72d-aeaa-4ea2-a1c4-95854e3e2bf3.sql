ALTER TABLE public.sessions DROP CONSTRAINT sessions_understanding_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_understanding_check CHECK (understanding >= 0 AND understanding <= 5);