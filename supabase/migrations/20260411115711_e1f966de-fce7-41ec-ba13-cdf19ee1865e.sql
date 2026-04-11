CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  effort INTEGER NOT NULL CHECK (effort BETWEEN 1 AND 5),
  understanding INTEGER NOT NULL CHECK (understanding BETWEEN 1 AND 5),
  engagement INTEGER NOT NULL CHECK (engagement BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.sessions FOR INSERT WITH CHECK (true);