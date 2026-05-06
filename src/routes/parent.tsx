import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GraduationCap, TrendingUp, Brain, Zap } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Parent Portal — TutorTrack" },
      { name: "description", content: "View your child's tutoring progress." },
    ],
  }),
  component: ParentPortal,
});

interface Student { id: string; name: string; subject: string; }
interface ParentSession {
  id: string; date: string; subject: string;
  effort: number; understanding: number; engagement: number;
  parent_summary: string | null; recommendation: string | null;
}

function ParentPortal() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<ParentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (role !== "parent") { navigate({ to: "/dashboard" }); return; }

    (async () => {
      const { data: students } = await supabase
        .from("students").select("id, name, subject").eq("parent_user_id", user.id).limit(1);
      const stu = students?.[0] ?? null;
      setStudent(stu);
      if (stu) {
        // Explicit column list — never select tutor's private `notes`
        const { data: sess } = await supabase
          .from("sessions")
          .select("id, date, subject, effort, understanding, engagement, parent_summary, recommendation")
          .eq("student_id", stu.id)
          .order("date", { ascending: false });
        setSessions(sess ?? []);
      }
      setLoading(false);
    })();
  }, [user, role, authLoading, roleLoading, navigate]);

  const chartData = useMemo(
    () => [...sessions].sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ date: s.date, Effort: s.effort, Understanding: s.understanding, Engagement: s.engagement })),
    [sessions]
  );

  const averages = useMemo(() => {
    if (sessions.length === 0) return { effort: 0, understanding: 0, engagement: 0 };
    const sum = sessions.reduce((a, s) => ({
      effort: a.effort + s.effort, understanding: a.understanding + s.understanding, engagement: a.engagement + s.engagement,
    }), { effort: 0, understanding: 0, engagement: 0 });
    return {
      effort: +(sum.effort / sessions.length).toFixed(1),
      understanding: +(sum.understanding / sessions.length).toFixed(1),
      engagement: +(sum.engagement / sessions.length).toFixed(1),
    };
  }, [sessions]);

  if (authLoading || roleLoading || loading) {
    return <div className="flex h-full items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!student) {
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm">Your child hasn't been linked to your account yet. Please ask your tutor to send you an invite.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{student.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{student.subject} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
      </div>

      {sessions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No sessions logged yet.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={<TrendingUp className="h-5 w-5 text-primary" />} bg="bg-primary/10" label="Avg Effort" value={averages.effort} />
            <StatCard icon={<Brain className="h-5 w-5 text-secondary" />} bg="bg-secondary/10" label="Avg Understanding" value={averages.understanding} />
            <StatCard icon={<Zap className="h-5 w-5 text-star-filled" />} bg="bg-star-filled/10" label="Avg Engagement" value={averages.engagement} />
          </div>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Progress Over Time</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Line type="monotone" dataKey="Effort" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Understanding" stroke="var(--color-secondary)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Engagement" stroke="var(--color-star-filled)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Session Reports</h2>
            <div className="space-y-3">
              {sessions.map((s) => (
                <Card key={s.id} className="shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{s.date}</span>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Effort: <span className="font-medium text-foreground">{s.effort}/5</span></span>
                        <span>Understanding: <span className="font-medium text-foreground">{s.understanding}/5</span></span>
                        <span>Engagement: <span className="font-medium text-foreground">{s.engagement}/5</span></span>
                      </div>
                    </div>
                    {s.parent_summary && (
                      <div className="rounded-lg bg-muted/50 p-3 mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                        <p className="text-sm text-foreground">{s.parent_summary}</p>
                      </div>
                    )}
                    {s.recommendation && (
                      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 mt-2">
                        <p className="text-xs font-medium text-primary mb-1">Recommendations</p>
                        <p className="text-sm text-foreground">{s.recommendation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: number }) {
  return (
    <Card className="shadow-sm"><CardContent className="py-4 flex items-center gap-3">
      <div className={`rounded-lg ${bg} p-2.5`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}<span className="text-xs text-muted-foreground font-normal">/5</span></p>
      </div>
    </CardContent></Card>
  );
}
