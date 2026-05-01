import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, UserPlus, Users, Pencil, Trash2 } from "lucide-react";
import { studentInputSchema } from "@/lib/sanitize";

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

  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      <div className="flex h-full items-center justify-center py-20">
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

  function openEdit(s: Student) {
    setEditStudent(s);
    setEditName(s.name);
    setEditSubject(s.subject);
    setEditParentEmail(s.parent_email);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudent || !editName.trim() || !editSubject.trim() || !editParentEmail.trim()) return;
    setEditSubmitting(true);
    const { error } = await supabase
      .from("students")
      .update({ name: editName.trim(), subject: editSubject.trim(), parent_email: editParentEmail.trim() })
      .eq("id", editStudent.id);
    if (error) {
      toast.error("Failed to update student.");
    } else {
      toast.success("Student updated!");
      setEditStudent(null);
      loadStudents();
    }
    setEditSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteStudent) return;
    setDeleting(true);
    const { error } = await supabase.from("students").delete().eq("id", deleteStudent.id);
    if (error) {
      toast.error("Failed to delete student.");
    } else {
      toast.success("Student deleted.");
      setDeleteStudent(null);
      loadStudents();
    }
    setDeleting(false);
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Students</h1>
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
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">New Student</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Johnson" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
              </div>
              <div className="space-y-2">
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
            <Card key={s.id} className="shadow-sm transition-all hover:shadow-md hover:border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/students/$studentId" params={{ studentId: encodeURIComponent(s.name) }} className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-sm text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{s.subject}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.parent_email}</p>
                  </Link>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.preventDefault(); openEdit(s); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.preventDefault(); setDeleteStudent(s); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editStudent} onOpenChange={(open) => { if (!open) setEditStudent(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Student Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Parent Email</Label>
              <Input type="email" value={editParentEmail} onChange={(e) => setEditParentEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={!editName.trim() || !editSubject.trim() || !editParentEmail.trim() || editSubmitting}>
              {editSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteStudent} onOpenChange={(open) => { if (!open) setDeleteStudent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium">{deleteStudent?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
