import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "../components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "../components/ui/card";
import { Users, CalendarDays, Clock, Loader2 } from "lucide-react";

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

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentWithLastSession[]>([]);
  const [weekSessions, setWeekSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    async function load() {
      const [studentsRes, sessionsRes] = await Promise.all([
        supabase.from("students").select("id, name, subject").order("name"),
        supabase.from("sessions").select("student_id, date"),
      ]);

      const studentList = studentsRes.data ?? [];
      const sessionList = sessionsRes.data ?? [];

      // Calculate sessions this week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const weekCount = sessionList.filter(
        (s) => new Date(s.date) >= startOfWeek
      ).length;
      setWeekSessions(weekCount);

      // Map students with their last session date
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

      // Sort: null (never had session) first, then oldest session date first
      enriched.sort((a, b) => {
        if (!a.lastSessionDate && !b.lastSessionDate) return 0;
        if (!a.lastSessionDate) return -1;
        if (!b.lastSessionDate) return 1;
        return a.lastSessionDate.localeCompare(b.lastSessionDate);
      });

      setStudents(enriched);
      setLoading(false);
    }

    load();
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold text-foreground mb-6">Dashboard</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card>
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{students.length}</p>
                    <p className="text-xs text-muted-foreground">Active Students</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{weekSessions}</p>
                    <p className="text-xs text-muted-foreground">Sessions This Week</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Students sorted by longest without session */}
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Students — Needs Attention</h2>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No students added yet.{" "}
                <Link to="/students" className="text-primary hover:underline">Add a student</Link>
              </p>
            ) : (
              <div className="space-y-2">
                {students.map((st) => (
                  <Link key={st.id} to="/students/$studentId" params={{ studentId: encodeURIComponent(st.name) }}>
                    <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-foreground text-sm">{st.name}</p>
                          <p className="text-xs text-muted-foreground">{st.subject}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {st.lastSessionDate ? (
                            <span>Last: {st.lastSessionDate}</span>
                          ) : (
                            <span className="text-destructive">No sessions yet</span>
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
      </main>
    </div>
  );
}
