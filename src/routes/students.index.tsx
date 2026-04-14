import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "../components/AppHeader";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { Loader2, UserPlus, Users } from "lucide-react";

export const Route = createFileRoute("/students/")({
  head: () => ({
    meta: [
      { title: "Students — TutorTrack" },
      { name: "description", content: "Manage your student profiles." },
    ],
  }),
  component: StudentsPage,
});

interface Student {
  id: string;
  name: string;
  subject: string;
  parent_email: string;
  created_at: string;
}

function StudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadStudents() {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setStudents(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    loadStudents();
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canSubmit = name.trim() && subject.trim() && parentEmail.trim() && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const { error } = await supabase.from("students").insert({
      name: name.trim(),
      subject: subject.trim(),
      parent_email: parentEmail.trim(),
      user_id: user!.id,
    });
    if (error) {
      toast.error("Failed to add student.");
    } else {
      toast.success("Student added!");
      setName("");
      setSubject("");
      setParentEmail("");
      setShowForm(false);
      loadStudents();
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Students</h1>
          <Button
            size="sm"
            variant={showForm ? "secondary" : "default"}
            onClick={() => setShowForm(!showForm)}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            {showForm ? "Cancel" : "Add Student"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">New Student</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Student Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Johnson" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentEmail">Parent Email</Label>
                  <Input id="parentEmail" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="e.g. parent@email.com" />
                </div>
                <Button type="submit" className="w-full" disabled={!canSubmit}>
                  {submitting ? "Saving…" : "Add Student"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users className="mb-3 h-10 w-10" />
            <p className="text-sm">No students yet. Add your first student above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((s) => (
              <Link key={s.id} to="/students/$studentId" params={{ studentId: encodeURIComponent(s.name) }} className="block">
                <Card className="transition-colors hover:bg-accent/40 cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-sm text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{s.subject}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.parent_email}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
