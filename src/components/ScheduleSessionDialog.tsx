import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  userId: string;
  onCreated: () => void;
}

interface StudentOption {
  id: string;
  name: string;
  subject: string;
}

export function ScheduleSessionDialog({ open, onOpenChange, defaultDate, userId, onCreated }: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("16:00");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      supabase
        .from("students")
        .select("id, name, subject")
        .order("name")
        .then(({ data }) => setStudents(data ?? []));
      if (defaultDate) setDate(defaultDate);
    }
  }, [open, defaultDate]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const canSubmit = selectedStudentId && date && startTime && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedStudent) return;
    setSubmitting(true);

    const { error } = await supabase.from("sessions").insert({
      student_name: selectedStudent.name,
      subject: selectedStudent.subject,
      date,
      start_time: startTime,
      duration_minutes: parseInt(duration, 10),
      notes: notes || null,
      effort: 0,
      understanding: 0,
      engagement: 0,
      status: "scheduled",
      user_id: userId,
      student_id: selectedStudentId,
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed to schedule session");
      return;
    }
    toast.success("Session scheduled!");
    setSelectedStudentId("");
    setNotes("");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Student</Label>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="90">90 min</SelectItem>
                <SelectItem value="120">120 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Topics to cover, preparation notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? "Scheduling…" : "Schedule Session"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
