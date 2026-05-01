import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { studentName, subject, notes, effort, understanding, engagement, userId } =
      await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch last 3 sessions for this student (excluding the current one being saved)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: recentSessions } = await supabase
      .from("sessions")
      .select("date, notes, effort, understanding, engagement, subject")
      .eq("student_name", studentName)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(3);

    // --- Generate single-session summary ---
    const summaryPrompt = `You are writing a progress update on behalf of a tutor to a parent. Your tone should be warm, professional and personal — like a thoughtful tutor writing a note, not a system generating a report. Using the session details below, write a 3-4 sentence parent-facing summary. Be specific to what was actually covered. Mention effort, understanding and engagement naturally within the sentences rather than listing them. End with one encouraging sentence about the student. Student: ${studentName} Subject: ${subject} Session notes: ${notes || "No notes provided"} Effort rating: ${effort}/5 Understanding rating: ${understanding}/5 Engagement rating: ${engagement}/5. Write only the summary. No headings, no bullet points, no preamble.`;

    const aiCall = async (systemMsg: string, userMsg: string) => {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: userMsg },
            ],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) throw { status: 429, message: "Rate limited" };
        if (response.status === 402) throw { status: 402, message: "Credits exhausted" };
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    };

    const summary = await aiCall(
      "You are a professional tutor assistant. Write concise, informative parent summaries. Be encouraging but measured — avoid exclamation marks and overly positive language. Focus on facts and gentle guidance.",
      summaryPrompt
    ) || "Summary unavailable.";

    // --- Generate multi-session recommendation ---
    let recommendation: string | null = null;

    // Include current session + recent sessions (up to 3 total)
    const allSessions = [
      { notes, effort, understanding, engagement, subject },
      ...(recentSessions || []),
    ].slice(0, 3);

    if (allSessions.length >= 2) {
      const s1 = allSessions[0];
      const s2 = allSessions[1];
      const s3: any = allSessions[2] ?? { notes: "N/A", effort: "N/A", understanding: "N/A", engagement: "N/A" };

      const recPrompt = `You are an experienced tutor reviewing a student's recent sessions to identify patterns and give specific guidance to parents. Based on the last 3 sessions below, write 2-3 sentences of specific, actionable recommendations. Focus on what the student should work on before the next session. Be encouraging in tone. Reference actual topics or patterns from the notes — never give generic advice. Student: ${studentName} Subject: ${subject} Session 1: ${s1.notes || "None"} | Effort: ${s1.effort}/5 | Understanding: ${s1.understanding}/5 | Engagement: ${s1.engagement}/5 Session 2: ${s2.notes || "None"} | Effort: ${s2.effort}/5 | Understanding: ${s2.understanding}/5 | Engagement: ${s2.engagement}/5 Session 3: ${s3.notes || "None"} | Effort: ${s3.effort}/5 | Understanding: ${s3.understanding}/5 | Engagement: ${s3.engagement}/5. Write only the recommendations. No headings, no bullet points, no preamble.`;

      try {
        recommendation = await aiCall(
          "You are a professional tutor assistant providing ongoing student recommendations. Identify trends across multiple sessions — improving or declining areas, consistent strengths or weaknesses. Be specific and actionable. Avoid generic advice.",
          recPrompt
        );
      } catch (e) {
        console.error("Recommendation generation failed:", e);
      }
    }

    return new Response(JSON.stringify({ summary, recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (e?.status === 429 || e?.status === 402) {
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("generate-summary error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
