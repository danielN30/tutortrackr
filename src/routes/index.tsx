import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "../components/AppHeader";
import { StarRating } from "../components/StarRating";
import { TopicTable, type TopicEntry } from "../components/TopicTable";
import { addSession } from "../lib/sessions";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Log Session — TutorTrack" },
      { name: "description", content: "Log a tutoring session with student ratings and notes." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/login" });
    return null;
  }

  return <SessionForm userId={user.id} />;
}

function SessionForm({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [topics, setTopics] = useState<TopicEntry[]>([]);
  const [effort, setEffort] = useState(0);
  const [engagement, setEngagement] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const allTopicsRated = topics.length > 0 && topics.every((t) => t.rating > 0);
  const canSubmit = studentName.trim() && subject.trim() && date && effort && engagement && allTopicsRated && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const notesText = topics
        .map((t) => `${t.topic} — ${t.rating}/5 stars`)
        .join("\n");

      await addSession({
        student_name: studentName.trim(),
        subject: subject.trim(),
        date,
        notes: notesText,
        effort,
        understanding: 0,
        engagement,
        user_id: userId,
      });
      toast.success("Session logged!");
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Failed to save session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Log a Session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Sarah Johnson" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <TopicTable topics={topics} onChange={setTopics} />
              <div className="grid grid-cols-2 gap-4">
                <StarRating label="Effort" value={effort} onChange={setEffort} />
                <StarRating label="Engagement" value={engagement} onChange={setEngagement} />
              </div>
              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? "Saving…" : "Submit Session"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
