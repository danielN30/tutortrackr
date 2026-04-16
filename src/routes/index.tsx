import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { StarRating } from "../components/StarRating";
import { TopicTable, type TopicEntry } from "../components/TopicTable";
import { addSession } from "../lib/sessions";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
      <div className="flex h-full items-center justify-center py-20">
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

interface StudentOption {
  id: string;
  name: string;
  subject: string;
}

function SessionForm({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [topics, setTopics] = useState<TopicEntry[]>([]);
  const [effort, setEffort] = useState(0);
  const [engagement, setEngagement] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("students")
      .select("id, name, subject")
      .order("name")
      .then(({ data }) => {
        setStudents(data ?? []);
        setStudentsLoading(false);
      });
  }, []);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const allTopicsRated = topics.length > 0 && topics.every((t) => t.rating > 0);
  const canSubmit = selectedStudentId && date && effort && engagement && allTopicsRated && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedStudent) return;
    setSubmitting(true);
    try {
      const notesText = topics
        .map((t) => `${t.topic} — ${t.rating}/5 stars`)
        .join("\n");

      await addSession({
        student_name: selectedStudent.name,
        subject: selectedStudent.subject,
        date,
        notes: notesText,
        effort,
        understanding: 0,
        engagement,
        user_id: userId,
        student_id: selectedStudentId,
      });
      toast.success("Session logged!");
      navigate({ to: "/session-history" });
    } catch {
      toast.error("Failed to save session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Log a Session</h1>
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Student</Label>
              {studentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
                </div>
              ) : students.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No students added yet.{" "}
                  <Link to="/students" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    Add a student
                  </Link>
                </p>
              ) : (
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {s.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
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
    </div>
  );
}
