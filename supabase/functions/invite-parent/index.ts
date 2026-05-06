// Sends a parent invite email and records it in parent_invites.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tutorId = userData.user.id;

    const { studentId, parentEmail, redirectTo } = await req.json();
    if (!studentId || !parentEmail) {
      return new Response(JSON.stringify({ error: "Missing studentId or parentEmail" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify tutor owns this student
    const { data: student, error: stuErr } = await admin
      .from("students").select("id, name, user_id").eq("id", studentId).single();
    if (stuErr || !student || student.user_id !== tutorId) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record invite (idempotent)
    const { error: insErr } = await admin.from("parent_invites").upsert({
      student_id: studentId,
      parent_email: parentEmail.toLowerCase(),
      invited_by: tutorId,
    }, { onConflict: "student_id,parent_email" });
    if (insErr) console.warn("invite upsert", insErr);

    // Send invite email via Supabase Auth
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(parentEmail, {
      redirectTo: redirectTo ?? undefined,
      data: { role: "parent", student_name: student.name },
    });

    // If user already exists, that's OK — link will happen if/when they sign up,
    // or they can sign in directly. Do not fail the request.
    if (inviteErr && !/already.*registered|already exists/i.test(inviteErr.message)) {
      // Check if a user with this email already exists; if so link them now.
      const { data: existing } = await admin.auth.admin.listUsers();
      const found = existing?.users?.find((u) => u.email?.toLowerCase() === parentEmail.toLowerCase());
      if (!found) {
        return new Response(JSON.stringify({ error: inviteErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If user already exists, link immediately
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email?.toLowerCase() === parentEmail.toLowerCase());
    if (found) {
      await admin.from("user_roles").upsert({ user_id: found.id, role: "parent" }, { onConflict: "user_id,role" });
      await admin.from("students").update({ parent_user_id: found.id }).eq("id", studentId);
      await admin.from("parent_invites").update({ accepted_at: new Date().toISOString() })
        .eq("student_id", studentId).eq("parent_email", parentEmail.toLowerCase());
    }

    return new Response(JSON.stringify({ ok: true, alreadyExisted: !!found }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
