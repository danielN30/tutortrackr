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
  parent_summary: string | null;
  created_at: string;
  user_id: string | null;
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
  user_id: string;
}): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .insert(session)
    .select()
    .single();
  if (error) throw error;

  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "generate-summary",
      {
        body: {
          studentName: session.student_name,
          subject: session.subject,
          notes: session.notes,
          effort: session.effort,
          understanding: session.understanding,
          engagement: session.engagement,
        },
      }
    );

    if (!fnError && fnData?.summary) {
      const { error: updateError } = await supabase
        .from("sessions")
        .update({ parent_summary: fnData.summary })
        .eq("id", data.id);
      if (!updateError) {
        data.parent_summary = fnData.summary;
      }
    }
  } catch {
    console.warn("AI summary generation failed");
  }

  return data;
}
