import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "../components/AppHeader";
import { getSessions, type Session } from "../lib/sessions";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, ArrowLeft, TrendingUp, Brain, Zap } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/students/$studentId")({
  head: () => ({
    meta: [
      { title: "Student Analytics — TutorTrack" },
      { name: "description", content: "View detailed student analytics and session history." },
    ],
  }),
  component: StudentAnalyticsPage,
});

function StudentAnalyticsPage() {
  const { studentId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const studentName = decodeURIComponent(studentId);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    getSessions()
      .then((all) => {
        setSessions(
          all.filter((s) => s.student_name === studentName)
        );
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate, studentName]);

  const chartData = useMemo(() => {
    return [...sessions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        date: s.date,
        Effort: s.effort,
        Understanding: s.understanding,
        Engagement: s.engagement,
      }));
  }, [sessions]);

  const averages = useMemo(() => {
    if (sessions.length === 0) return { effort: 0, understanding: 0, engagement: 0 };
    const sum = sessions.reduce(
      (acc, s) => ({
        effort: acc.effort + s.effort,
        understanding: acc.understanding + s.understanding,
        engagement: acc.engagement + s.engagement,
      }),
      { effort: 0, understanding: 0, engagement: 0 }
    );
    return {
      effort: +(sum.effort / sessions.length).toFixed(1),
      understanding: +(sum.understanding / sessions.length).toFixed(1),
      engagement: +(sum.engagement / sessions.length).toFixed(1),
    };
  }, [sessions]);

  const subject = useMemo(() => {
    if (sessions.length === 0) return "";
    return sessions[0].subject;
  }, [sessions]);

  const reverseSessions = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [sessions]
  );

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
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/students"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">{studentName}</h1>
          {subject && (
            <p className="text-sm text-muted-foreground mt-1">{subject} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No sessions found for this student.</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="rounded-md bg-green-500/10 p-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Effort</p>
                    <p className="text-lg font-semibold text-foreground">{averages.effort}<span className="text-xs text-muted-foreground font-normal">/5</span></p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="rounded-md bg-blue-500/10 p-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Understanding</p>
                    <p className="text-lg font-semibold text-foreground">{averages.understanding}<span className="text-xs text-muted-foreground font-normal">/5</span></p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="rounded-md bg-orange-500/10 p-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Engagement</p>
                    <p className="text-lg font-semibold text-foreground">{averages.engagement}<span className="text-xs text-muted-foreground font-normal">/5</span></p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ratings Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border)" }}
                      />
                      <YAxis
                        domain={[0, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius)",
                          fontSize: 13,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13 }} />
                      <Line type="monotone" dataKey="Effort" stroke="oklch(0.65 0.20 145)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Understanding" stroke="oklch(0.60 0.20 260)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Engagement" stroke="oklch(0.70 0.18 50)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Session History */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Session History</h2>
              <div className="space-y-3">
                {reverseSessions.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{s.date}</span>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Effort: <span className="font-medium text-foreground">{s.effort}/5</span></span>
                          <span>Understanding: <span className="font-medium text-foreground">{s.understanding}/5</span></span>
                          <span>Engagement: <span className="font-medium text-foreground">{s.engagement}/5</span></span>
                        </div>
                      </div>
                      {s.notes && (
                        <p className="text-xs text-muted-foreground mb-2 whitespace-pre-line">{s.notes}</p>
                      )}
                      {s.parent_summary && (
                        <div className="rounded-md bg-muted/50 p-3 mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                          <p className="text-sm text-foreground">{s.parent_summary}</p>
                        </div>
                      )}
                      {s.recommendation && (
                        <div className="rounded-md bg-primary/5 border border-primary/10 p-3 mt-2">
                          <p className="text-xs font-medium text-primary mb-1">Ongoing Recommendations</p>
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
      </main>
    </div>
  );
}
