
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('tutor', 'parent');

-- user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Add parent_user_id to students
ALTER TABLE public.students ADD COLUMN parent_user_id uuid;
CREATE INDEX idx_students_parent_user_id ON public.students(parent_user_id);

-- parent_invites table
CREATE TABLE public.parent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_email text NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (student_id, parent_email)
);
ALTER TABLE public.parent_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_parent_invites_email ON public.parent_invites(lower(parent_email));

CREATE POLICY "Tutors manage own invites" ON public.parent_invites
  FOR ALL TO authenticated
  USING (auth.uid() = invited_by) WITH CHECK (auth.uid() = invited_by);

-- Trigger: when a new user signs up, assign roles & link to student via invite if email matches
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text := NEW.email;
  v_invite_count int;
BEGIN
  SELECT count(*) INTO v_invite_count
  FROM public.parent_invites
  WHERE lower(parent_email) = lower(v_email) AND accepted_at IS NULL;

  IF v_invite_count > 0 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'parent')
    ON CONFLICT DO NOTHING;

    UPDATE public.students s
    SET parent_user_id = NEW.id
    FROM public.parent_invites pi
    WHERE pi.student_id = s.id
      AND lower(pi.parent_email) = lower(v_email)
      AND pi.accepted_at IS NULL;

    UPDATE public.parent_invites
    SET accepted_at = now()
    WHERE lower(parent_email) = lower(v_email) AND accepted_at IS NULL;
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'tutor')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: existing users get tutor role
INSERT INTO public.user_roles(user_id, role)
SELECT id, 'tutor'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- Parents can read their linked student
CREATE POLICY "Parents can read their student" ON public.students
  FOR SELECT TO authenticated USING (parent_user_id = auth.uid());

-- Parents can read sessions for their student (note: app hides 'notes' field for parents)
CREATE POLICY "Parents can read their student sessions" ON public.sessions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = sessions.student_id AND s.parent_user_id = auth.uid()
  ));
