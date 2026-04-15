import { supabase } from "@/integrations/supabase/client";

export interface Session {
  id: string;
  student_name: string;
  subject: string;
  date: string;
  start_time: string | null;
  duration_minutes: number;
  notes: string | null;
  effort: number;
  understanding: number;
  engagement: number;
  status: string;
  parent_summary: string | null;
  recommendation: string | null;
  created_at: string;
  user_id: string | null;
  student_id: string | null;
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
  student_id?: string;
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
          userId: session.user_id,
        },
      }
    );

    if (!fnError && fnData) {
      const updates: { parent_summary?: string; recommendation?: string } = {};
      if (fnData.summary) updates.parent_summary = fnData.summary;
      if (fnData.recommendation) updates.recommendation = fnData.recommendation;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("sessions")
          .update(updates)
          .eq("id", data.id);
        if (!updateError) {
          if (fnData.summary) data.parent_summary = fnData.summary;
          if (fnData.recommendation) data.recommendation = fnData.recommendation;
        }
      }
    }
  } catch {
    console.warn("AI summary generation failed");
  }

  return data;
}
