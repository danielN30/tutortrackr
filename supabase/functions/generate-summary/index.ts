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
    const summaryPrompt = `You are a tutor writing a brief, honest summary for a parent about their child's tutoring session. Keep it to 2-3 sentences. Be informative and encouraging but avoid being overly enthusiastic or using excessive praise. Focus on what was covered, how the student performed, and any areas to keep working on.

Student: ${studentName}
Subject: ${subject}
Session Notes: ${notes || "No notes provided"}
Effort: ${effort}/5
Understanding: ${understanding}/5
Engagement: ${engagement}/5

Write a calm, informative parent summary.`;

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

    // Include current session + recent sessions (up to 3 total history)
    const allSessions = [
      { date: "Current session", notes, effort, understanding, engagement, subject },
      ...(recentSessions || []),
    ];

    if (allSessions.length >= 2) {
      const sessionsText = allSessions
        .map((s, i) => `Session ${i + 1} (${s.date}): Subject: ${s.subject}, Notes: ${s.notes || "None"}, Effort: ${s.effort}/5, Understanding: ${s.understanding}/5, Engagement: ${s.engagement}/5`)
        .join("\n");

      const recPrompt = `Based on the following recent tutoring sessions for ${studentName}, identify patterns across sessions and suggest 1-2 specific focus areas for the student going forward. Be concise (2-3 sentences), constructive and actionable.

${sessionsText}

Write ongoing recommendations.`;

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
