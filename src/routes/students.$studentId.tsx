import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSessions, type Session } from "../lib/sessions";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2, ArrowLeft, TrendingUp, Brain, Zap, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
        setSessions(all.filter((s) => s.student_name === studentName));
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const navy: [number, number, number] = [15, 32, 70];
    const teal: [number, number, number] = [20, 166, 166];

    doc.setFontSize(20);
    doc.setTextColor(...navy);
    doc.text("Student Progress Report", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Student: ${studentName}`, 14, 32);
    if (subject) doc.text(`Subject: ${subject}`, 14, 39);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 46);
    doc.text(`Total Sessions: ${sessions.length}`, 14, 53);

    doc.setFontSize(14);
    doc.setTextColor(...navy);
    doc.text("Average Ratings", 14, 65);
    autoTable(doc, {
      startY: 69,
      head: [["Effort", "Understanding", "Engagement"]],
      body: [[`${averages.effort}/5`, `${averages.understanding}/5`, `${averages.engagement}/5`]],
      headStyles: { fillColor: navy },
      theme: "grid",
    });

    let nextY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(...navy);
    doc.text("Session Ratings History", 14, nextY);
    autoTable(doc, {
      startY: nextY + 4,
      head: [["Date", "Effort", "Understanding", "Engagement"]],
      body: chartData.map((d) => [d.date, `${d.Effort}/5`, `${d.Understanding}/5`, `${d.Engagement}/5`]),
      headStyles: { fillColor: teal },
      theme: "striped",
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;
    const last5 = reverseSessions.slice(0, 5);
    const summaries = last5.filter((s) => s.parent_summary);
    if (summaries.length > 0) {
      if (nextY > 240) { doc.addPage(); nextY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(...navy);
      doc.text("Last 5 Session Summaries", 14, nextY);
      nextY += 6;
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      summaries.forEach((s) => {
        const text = doc.splitTextToSize(`${s.date}: ${s.parent_summary}`, 180);
        if (nextY + text.length * 5 > 280) { doc.addPage(); nextY = 20; }
        doc.text(text, 14, nextY);
        nextY += text.length * 5 + 4;
      });
    }

    const recs = reverseSessions.filter((s) => s.recommendation).slice(0, 3);
    if (recs.length > 0) {
      nextY += 4;
      if (nextY > 240) { doc.addPage(); nextY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(...navy);
      doc.text("Ongoing Recommendations", 14, nextY);
      nextY += 6;
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      recs.forEach((s) => {
        const text = doc.splitTextToSize(`${s.date}: ${s.recommendation}`, 180);
        if (nextY + text.length * 5 > 280) { doc.addPage(); nextY = 20; }
        doc.text(text, 14, nextY);
        nextY += text.length * 5 + 4;
      });
    }

    doc.save(`${studentName.replace(/\s+/g, "_")}_progress_report.pdf`);
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
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
          <div className="grid grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Effort</p>
                  <p className="text-lg font-semibold text-foreground">{averages.effort}<span className="text-xs text-muted-foreground font-normal">/5</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="rounded-lg bg-secondary/10 p-2.5">
                  <Brain className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Understanding</p>
                  <p className="text-lg font-semibold text-foreground">{averages.understanding}<span className="text-xs text-muted-foreground font-normal">/5</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="rounded-lg bg-star-filled/10 p-2.5">
                  <Zap className="h-5 w-5 text-star-filled" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Engagement</p>
                  <p className="text-lg font-semibold text-foreground">{averages.engagement}<span className="text-xs text-muted-foreground font-normal">/5</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
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
                    <Line type="monotone" dataKey="Effort" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Understanding" stroke="var(--color-secondary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Engagement" stroke="var(--color-star-filled)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Session History</h2>
            <div className="space-y-3">
              {reverseSessions.map((s) => (
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
                    {s.notes && (
                      <p className="text-xs text-muted-foreground mb-2 whitespace-pre-line">{s.notes}</p>
                    )}
                    {s.parent_summary && (
                      <div className="rounded-lg bg-muted/50 p-3 mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                        <p className="text-sm text-foreground">{s.parent_summary}</p>
                      </div>
                    )}
                    {s.recommendation && (
                      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 mt-2">
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
    </div>
  );
}
