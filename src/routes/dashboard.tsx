import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "../components/ui/card";
import { Users, CalendarDays, Clock, Loader2 } from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TutorTrack" },
      { name: "description", content: "Tutor overview dashboard." },
    ],
  }),
  component: DashboardPage,
});

interface StudentWithLastSession {
  id: string;
  name: string;
  subject: string;
  lastSessionDate: string | null;
}

// Module-level cache for dashboard data (persists across route navigations).
const CACHE_TTL_MS = 60_000;
let dashboardCache: {
  userId: string;
  expiresAt: number;
  students: StudentWithLastSession[];
  weekSessions: number;
} | null = null;

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentWithLastSession[]>(
    () => (dashboardCache && dashboardCache.userId === (user?.id ?? "") ? dashboardCache.students : [])
  );
  const [weekSessions, setWeekSessions] = useState(
    () => (dashboardCache && dashboardCache.userId === (user?.id ?? "") ? dashboardCache.weekSessions : 0)
  );
  const [loading, setLoading] = useState(() => {
    if (!user) return true;
    return !(dashboardCache && dashboardCache.userId === user.id && dashboardCache.expiresAt > Date.now());
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    // Serve cached data instantly if fresh
    if (
      dashboardCache &&
      dashboardCache.userId === user.id &&
      dashboardCache.expiresAt > Date.now()
    ) {
      setStudents(dashboardCache.students);
      setWeekSessions(dashboardCache.weekSessions);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      // Only fetch the columns this page actually renders, scoped to current user.
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekIso = startOfWeek.toISOString().slice(0, 10);

      const [studentsRes, sessionsRes, weekCountRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, name, subject")
          .eq("user_id", user!.id)
          .order("name"),
        supabase
          .from("sessions")
          .select("student_id, date")
          .eq("user_id", user!.id),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .gte("date", startOfWeekIso),
      ]);

      if (cancelled) return;

      const studentList = studentsRes.data ?? [];
      const sessionList = sessionsRes.data ?? [];
      const weekCount = weekCountRes.count ?? 0;

      const lastSessionMap = new Map<string, string>();
      for (const s of sessionList) {
        if (!s.student_id) continue;
        const existing = lastSessionMap.get(s.student_id);
        if (!existing || s.date > existing) {
          lastSessionMap.set(s.student_id, s.date);
        }
      }

      const enriched: StudentWithLastSession[] = studentList.map((st) => ({
        id: st.id,
        name: st.name,
        subject: st.subject,
        lastSessionDate: lastSessionMap.get(st.id) ?? null,
      }));

      enriched.sort((a, b) => {
        if (!a.lastSessionDate && !b.lastSessionDate) return 0;
        if (!a.lastSessionDate) return -1;
        if (!b.lastSessionDate) return 1;
        return a.lastSessionDate.localeCompare(b.lastSessionDate);
      });

      dashboardCache = {
        userId: user!.id,
        expiresAt: Date.now() + CACHE_TTL_MS,
        students: enriched,
        weekSessions: weekCount,
      };

      setStudents(enriched);
      setWeekSessions(weekCount);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Dashboard</h1>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Stats */}
          <div data-tour="analytics" className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{students.length}</p>
                  <p className="text-sm text-muted-foreground">Active Students</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <CalendarDays className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{weekSessions}</p>
                  <p className="text-sm text-muted-foreground">Sessions This Week</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Needs Attention */}
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Needs Attention
          </h2>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No students added yet.{" "}
              <Link to="/students" className="text-primary hover:underline">Add a student</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((st) => (
                <Link key={st.id} to="/students/$studentId" params={{ studentId: encodeURIComponent(st.name) }}>
                  <Card className="shadow-sm transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium text-foreground">{st.name}</p>
                        <p className="text-xs text-muted-foreground">{st.subject}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {st.lastSessionDate ? (
                          <span>Last: {st.lastSessionDate}</span>
                        ) : (
                          <span className="text-destructive font-medium">No sessions yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
