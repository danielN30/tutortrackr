import { supabase } from "@/integrations/supabase/client";

export interface Session {
  id: string;
  student_name: string;
  subject: string;
  date: string;
  notes: string | null;
  effort: number;
  understanding: number;
  engagement: number;
  created_at: string;
}

export async function getSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addSession(session: {
  student_name: string;
  subject: string;
  date: string;
  notes: string;
  effort: number;
  understanding: number;
  engagement: number;
}): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .insert(session)
    .select()
    .single();
  if (error) throw error;
  return data;
}
