import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { StarRating } from "../components/StarRating";
import { addSession } from "../lib/sessions";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

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
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [effort, setEffort] = useState(0);
  const [understanding, setUnderstanding] = useState(0);
  const [engagement, setEngagement] = useState(0);

  const canSubmit = studentName.trim() && subject.trim() && date && effort && understanding && engagement;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    addSession({ studentName: studentName.trim(), subject: subject.trim(), date, notes: notes.trim(), effort, understanding, engagement });
    navigate({ to: "/dashboard" });
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
              <div className="space-y-1.5">
                <Label htmlFor="notes">Session Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was covered? Any observations?" rows={4} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <StarRating label="Effort" value={effort} onChange={setEffort} />
                <StarRating label="Understanding" value={understanding} onChange={setUnderstanding} />
                <StarRating label="Engagement" value={engagement} onChange={setEngagement} />
              </div>
              <Button type="submit" className="w-full" disabled={!canSubmit}>
                Submit Session
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
