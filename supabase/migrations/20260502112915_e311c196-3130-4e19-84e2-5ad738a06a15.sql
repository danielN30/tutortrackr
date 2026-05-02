ALTER TABLE public.sessions DROP CONSTRAINT sessions_effort_check;
ALTER TABLE public.sessions DROP CONSTRAINT sessions_engagement_check;
ALTER TABLE public.sessions DROP CONSTRAINT sessions_understanding_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_effort_check CHECK (effort >= 0 AND effort <= 5);
ALTER TABLE public.sessions ADD CONSTRAINT sessions_engagement_check CHECK (engagement >= 0 AND engagement <= 5);
ALTER TABLE public.sessions ADD CONSTRAINT sessions_understanding_check CHECK (understanding >= 0 AND understanding <= 5);