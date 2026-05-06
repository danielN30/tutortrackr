import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "tutor" | "parent";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setRole(null); setLoading(false); return; }
    let cancelled = false;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      if (cancelled) return;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      // Parent takes precedence in UI if user has both somehow
      setRole(roles.includes("parent") ? "parent" : roles.includes("tutor") ? "tutor" : "tutor");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { role, loading: loading || authLoading, isParent: role === "parent", isTutor: role === "tutor" };
}
