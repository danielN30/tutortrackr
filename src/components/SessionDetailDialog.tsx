import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addSession } from "@/lib/sessions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/calendar-utils";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface SessionData {
  id: string;
  student_name: string;
  subject: string;
  date: string;
  start_time: string | null;
  duration_minutes: number;
  notes: string | null;
  effort: number;
  understanding: number;
  engagement: number;
  status: string;
  parent_summary: string | null;
  recommendation: string | null;
  student_id: string | null;
  user_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionData | null;
  onUpdated: () => void;
}

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

export function SessionDetailDialog({ open, onOpenChange, session, onUpdated }: Props) {
  const [effort, setEffort] = useState(0);
  const [engagement, setEngagement] = useState(0);
  const [completionNotes, setCompletionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!session) return null;

  const isScheduled = session.status === "scheduled";
  const isCompleted = session.status === "completed";

  async function handleComplete() {
    if (!session) return;
    setSubmitting(true);

    try {
      // Update the session with metrics and mark completed
      const { error } = await supabase
        .from("sessions")
        .update({
          status: "completed",
          effort,
          engagement,
          notes: completionNotes || session.notes,
        })
        .eq("id", session.id);

      if (error) throw error;

      // Trigger AI summary generation
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "generate-summary",
          {
            body: {
              studentName: session.student_name,
              subject: session.subject,
              notes: completionNotes || session.notes,
              effort,
              understanding: 0,
              engagement,
            },
          }
        );

        if (!fnError && fnData) {
          const updates: { parent_summary?: string; recommendation?: string } = {};
          if (fnData.summary) updates.parent_summary = fnData.summary;
          if (fnData.recommendation) updates.recommendation = fnData.recommendation;
          if (Object.keys(updates).length > 0) {
            await supabase.from("sessions").update(updates).eq("id", session.id);
          }
        }
      } catch {
        console.warn("AI summary generation failed");
      }

      toast.success("Session completed!");
      onOpenChange(false);
      onUpdated();
    } catch {
      toast.error("Failed to complete session");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {session.student_name}
            <Badge
              variant={isScheduled ? "default" : "secondary"}
              className={isScheduled ? "bg-session-scheduled text-white" : "bg-session-completed text-white"}
            >
              {session.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Subject</span>
              <p className="font-medium text-foreground">{session.subject}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="font-medium text-foreground">{session.date}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Time</span>
              <p className="font-medium text-foreground">{formatTime(session.start_time) || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium text-foreground">{session.duration_minutes} min</p>
            </div>
          </div>

          {session.notes && (
            <div>
              <span className="text-sm text-muted-foreground">Notes</span>
              <p className="text-sm text-foreground mt-0.5 leading-relaxed">{session.notes}</p>
            </div>
          )}

          {isCompleted && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20">Effort</span>
                <Stars count={session.effort} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20">Engagement</span>
                <Stars count={session.engagement} />
              </div>
              {session.parent_summary && (
                <div className="mt-3 rounded-md bg-accent/50 px-3 py-2">
                  <p className="text-xs font-medium text-foreground mb-0.5">Parent Summary</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{session.parent_summary}</p>
                </div>
              )}
              {session.recommendation && (
                <div className="mt-2 rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
                  <p className="text-xs font-medium text-primary mb-0.5">Ongoing Recommendations</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{session.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {isScheduled && (
            <div className="space-y-4 border-t pt-3">
              <p className="text-sm font-medium text-foreground">Complete This Session</p>
              <div className="grid grid-cols-2 gap-4">
                <StarRating label="Effort" value={effort} onChange={setEffort} />
                <StarRating label="Engagement" value={engagement} onChange={setEngagement} />
              </div>
              <div className="space-y-1.5">
                <Label>Session Notes</Label>
                <Textarea
                  placeholder="What was covered in this session…"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleComplete}
                className="w-full"
                disabled={!effort || !engagement || submitting}
              >
                {submitting ? "Completing…" : "Mark as Completed"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
