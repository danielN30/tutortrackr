ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Australia/Sydney';
CREATE OR REPLACE VIEW public.shared_calendar_sessions WITH (security_barrier = true) AS
 SELECT se.id, se.student_id, se.student_name, se.subject, se.date, se.start_time, se.duration_minutes, se.status, se.time_zone, se.effort, se.understanding, se.engagement, se.parent_summary, se.recommendation
 FROM public.sessions se WHERE se.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.students st WHERE st.id = se.student_id AND st.parent_user_id = auth.uid());
REVOKE ALL ON public.shared_calendar_sessions FROM anon;
GRANT SELECT ON public.shared_calendar_sessions TO authenticated;
GRANT ALL ON public.shared_calendar_sessions TO service_role;
DROP POLICY IF EXISTS "Parents can read their student sessions" ON public.sessions;
CREATE TABLE public.session_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, parent_id uuid NOT NULL, tutor_id uuid NOT NULL,
 date date NOT NULL, start_time time NOT NULL, duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes IN (30,45,60,90,120)), time_zone text NOT NULL DEFAULT 'Australia/Sydney', message text NOT NULL DEFAULT '' CHECK (length(message) <= 2000),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','cancelled')), session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz);
GRANT SELECT, INSERT ON public.session_requests TO authenticated;
GRANT ALL ON public.session_requests TO service_role;
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read requests" ON public.session_requests FOR SELECT TO authenticated USING (parent_id = auth.uid() OR tutor_id = auth.uid());
CREATE POLICY "Parents request for linked children" ON public.session_requests FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid() AND status = 'pending' AND session_id IS NULL AND resolved_at IS NULL AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.parent_user_id = auth.uid() AND s.user_id = tutor_id));
CREATE INDEX session_requests_participants ON public.session_requests(tutor_id,parent_id,status);
CREATE OR REPLACE FUNCTION public.validate_session_request() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.time_zone) THEN RAISE EXCEPTION 'Choose a valid time zone'; END IF;
 IF (NEW.date + NEW.start_time) AT TIME ZONE NEW.time_zone <= now() THEN RAISE EXCEPTION 'Please choose a future session time'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER validate_session_request BEFORE INSERT ON public.session_requests FOR EACH ROW EXECUTE FUNCTION public.validate_session_request();
CREATE OR REPLACE FUNCTION public.resolve_session_request(request_id uuid, decision text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.session_requests; s public.students; new_session uuid;
BEGIN
 SELECT * INTO r FROM public.session_requests WHERE id = request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 SELECT * INTO s FROM public.students WHERE id = r.student_id;
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF decision = 'cancelled' THEN
  IF r.parent_id <> auth.uid() OR s.parent_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
 ELSIF decision IN ('approved','declined') THEN
  IF r.tutor_id <> auth.uid() OR s.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
 ELSE RAISE EXCEPTION 'Invalid decision'; END IF;
 IF r.status <> 'pending' THEN RAISE EXCEPTION 'Request already resolved'; END IF;
 IF decision = 'approved' THEN
  IF s.parent_user_id IS DISTINCT FROM r.parent_id THEN RAISE EXCEPTION 'Parent is no longer linked'; END IF;
  IF (r.date + r.start_time) AT TIME ZONE r.time_zone <= now() THEN RAISE EXCEPTION 'This requested time has passed'; END IF;
  IF EXISTS (SELECT 1 FROM public.sessions se WHERE se.user_id = auth.uid() AND se.status = 'scheduled' AND se.start_time IS NOT NULL AND
    (se.date + se.start_time) AT TIME ZONE se.time_zone < (r.date + r.start_time) AT TIME ZONE r.time_zone + make_interval(mins => r.duration_minutes) AND
    (se.date + se.start_time) AT TIME ZONE se.time_zone + make_interval(mins => se.duration_minutes) > (r.date + r.start_time) AT TIME ZONE r.time_zone) THEN RAISE EXCEPTION 'You already have a session at this time'; END IF;
  INSERT INTO public.sessions(student_id,user_id,student_name,subject,date,start_time,duration_minutes,time_zone,effort,understanding,engagement,status)
   VALUES (s.id,s.user_id,s.name,s.subject,r.date,r.start_time,r.duration_minutes,r.time_zone,0,0,0,'scheduled') RETURNING id INTO new_session;
 END IF;
 UPDATE public.session_requests SET status = decision, session_id = new_session, resolved_at = now() WHERE id = r.id;
 RETURN new_session;
END $$;
REVOKE ALL ON FUNCTION public.resolve_session_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_session_request(uuid,text) TO authenticated;
