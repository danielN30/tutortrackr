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
  // 1. Insert the session
  const { data, error } = await supabase
    .from("sessions")
    .insert(session)
    .select()
    .single();
  if (error) throw error;

  // 2. Generate AI summary (non-blocking for the insert)
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
    // Summary generation failed silently — session is still saved
    console.warn("AI summary generation failed");
  }

  return data;
}
