
-- Add user_id to sessions
ALTER TABLE public.sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to students
ALTER TABLE public.students ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies on sessions
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;

-- Drop old permissive policies on students
DROP POLICY IF EXISTS "Anyone can insert students" ON public.students;
DROP POLICY IF EXISTS "Anyone can read students" ON public.students;

-- New RLS policies for sessions
CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- New RLS policies for students
CREATE POLICY "Users can insert own students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own students"
  ON public.students FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own students"
  ON public.students FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own students"
  ON public.students FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
