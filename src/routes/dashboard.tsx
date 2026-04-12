import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "../components/AppHeader";
import { getSessions, type Session } from "../lib/sessions";
import { Card, CardContent } from "../components/ui/card";
import { Star, BookOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TutorTrack" },
      { name: "description", content: "View all logged tutoring sessions." },
    ],
  }),
  component: DashboardPage,
});

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= count ? "fill-[var(--star-filled)] text-[var(--star-filled)]" : "fill-transparent text-[var(--star-empty)]"}`}
        />
      ))}
    </div>
  );
}

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    getSessions().then(setSessions).finally(() => setLoading(false));
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
        <h1 className="mb-6 text-xl font-semibold text-foreground">Session History</h1>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="mb-3 h-10 w-10" />
            <p className="text-sm">No sessions logged yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-foreground">{s.student_name}</span>
                      <span className="text-sm text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{s.subject}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.date}</p>
                    {s.notes && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.notes}</p>}
                    {s.parent_summary && (
                      <div className="mt-3 rounded-md bg-accent/50 px-3 py-2">
                        <p className="text-xs font-medium text-foreground mb-0.5">Parent Summary</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{s.parent_summary}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5 text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">Effort</span>
                      <Stars count={s.effort} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">Engagement</span>
                      <Stars count={s.engagement} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
