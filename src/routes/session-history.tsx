import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { type Session } from "../lib/sessions";
import { supabase } from "../integrations/supabase/client";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
import { Star, BookOpen, Loader2, Pencil, Trash2, Sparkles, Check, X, RefreshCw } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { SessionListSkeleton } from "@/components/skeletons";
import { StarRating } from "../components/StarRating";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/session-history")({
  head: () => ({
    meta: [
      { title: "Session History — TutorTrack" },
      { name: "description", content: "View all logged tutoring sessions." },
    ],
  }),
  component: SessionHistoryPage,
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

const PAGE_SIZE = 10;

function parseTopicNotes(notes: string | null): { topic: string; rating: number }[] | null {
  if (!notes) return null;
  const lines = notes.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const re = /^(.+?)\s+[—-]\s+(\d)\s*\/\s*5(?:\s*stars?)?$/i;
  const parsed: { topic: string; rating: number }[] = [];
  for (const line of lines) {
    const m = line.match(re);
    if (!m) return null;
    parsed.push({ topic: m[1].trim(), rating: Number(m[2]) });
  }
  return parsed;
}

function SessionHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState("all");

  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editEffort, setEditEffort] = useState(0);
  const [editUnderstanding, setEditUnderstanding] = useState(0);
  const [editEngagement, setEditEngagement] = useState(0);
  const [editDate, setEditDate] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteSession, setDeleteSession] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inline summary editing & regeneration state, keyed by session id
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [savingSummaryId, setSavingSummaryId] = useState<string | null>(null);
  const [regenSummaryId, setRegenSummaryId] = useState<string | null>(null);
  const [regenRecId, setRegenRecId] = useState<string | null>(null);

  const updateLocalSession = useCallback((id: string, patch: Partial<Session>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  function startEditSummary(s: Session) {
    setEditingSummaryId(s.id);
    setSummaryDraft(s.parent_summary ?? "");
  }

  async function saveSummary(s: Session) {
    setSavingSummaryId(s.id);
    const { error } = await supabase
      .from("sessions")
      .update({ parent_summary: summaryDraft, summary_edited: true })
      .eq("id", s.id);
    if (error) {
      toast.error("Failed to save summary.");
    } else {
      updateLocalSession(s.id, { parent_summary: summaryDraft, summary_edited: true });
      setEditingSummaryId(null);
      toast.success("Summary updated.");
    }
    setSavingSummaryId(null);
  }

  async function regenerate(s: Session, kind: "summary" | "recommendation") {
    if (kind === "summary") setRegenSummaryId(s.id);
    else setRegenRecId(s.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: {
          studentName: s.student_name,
          subject: s.subject,
          notes: s.notes ?? "",
          effort: s.effort,
          understanding: s.understanding,
          engagement: s.engagement,
          mode: kind,
        },
      });
      if (error) throw error;
      const updates: Partial<Session> = {};
      if (kind === "summary" && data?.summary) {
        updates.parent_summary = data.summary;
        updates.summary_edited = false;
      }
      if (kind === "recommendation" && data?.recommendation) {
        updates.recommendation = data.recommendation;
      }
      if (Object.keys(updates).length === 0) {
        toast.error(kind === "recommendation"
          ? "Need at least 2 sessions for this student to generate recommendations."
          : "AI did not return a result.");
      } else {
        const { error: upErr } = await supabase.from("sessions").update(updates).eq("id", s.id);
        if (upErr) throw upErr;
        updateLocalSession(s.id, updates);
        toast.success(kind === "summary" ? "Summary regenerated." : "Recommendations regenerated.");
      }
    } catch (e: any) {
      toast.error(e?.message || "AI request failed. Please try again.");
    } finally {
      if (kind === "summary") setRegenSummaryId(null);
      else setRegenRecId(null);
    }
  }

  const fetchPage = useCallback(
    async (pageIndex: number, replace: boolean) => {
      if (!user) return;
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) {
        toast.error("Failed to load sessions.");
        return;
      }
      const rows = (data ?? []) as Session[];
      setHasMore(rows.length === PAGE_SIZE);
      setSessions((prev) => (replace ? rows : [...prev, ...rows]));
      setPage(pageIndex);
    },
    [user]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    await fetchPage(0, true);
    setLoading(false);
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    reload();
  }, [user, authLoading, navigate, reload]);


  const studentNames = useMemo(() => {
    const names = new Set(sessions.map((s) => s.student_name));
    return Array.from(names).sort();
  }, [sessions]);

  const filtered = useMemo(
    () =>
      selectedStudent === "all"
        ? sessions
        : sessions.filter((s) => s.student_name === selectedStudent),
    [sessions, selectedStudent]
  );

  const lastSessionDate = filtered.length > 0 ? filtered[0].date : null;

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function openEdit(s: Session) {
    setEditSession(s);
    setEditNotes(s.notes ?? "");
    setEditEffort(s.effort);
    setEditUnderstanding(s.understanding);
    setEditEngagement(s.engagement);
    setEditDate(s.date);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSession) return;
    setEditSubmitting(true);
    const { error } = await supabase
      .from("sessions")
      .update({
        notes: editNotes,
        effort: editEffort,
        understanding: editUnderstanding,
        engagement: editEngagement,
        date: editDate,
      })
      .eq("id", editSession.id);
    if (error) {
      toast.error("Failed to update session.");
    } else {
      toast.success("Session updated!");
      setEditSession(null);
      reload();
    }
    setEditSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteSession) return;
    setDeleting(true);
    const { error } = await supabase.from("sessions").delete().eq("id", deleteSession.id);
    if (error) {
      toast.error("Failed to delete session.");
    } else {
      toast.success("Session deleted.");
      setDeleteSession(null);
      reload();
    }
    setDeleting(false);
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Session History</h1>
        {!loading && sessions.length > 0 && (
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {studentNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!loading && sessions.length > 0 && (
        <div className="mb-6 flex gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{filtered.length}</span>{" "}
            session{filtered.length !== 1 ? "s" : ""}
          </span>
          {lastSessionDate && (
            <>
              <span>·</span>
              <span>Last session: {lastSessionDate}</span>
            </>
          )}
        </div>
      )}

      {loading ? (
        <SessionListSkeleton />
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="mb-3 h-10 w-10" />
          <p className="text-sm">No sessions logged yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="mb-3 h-10 w-10" />
          <p className="text-sm">No sessions for this student.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id} className="shadow-sm">
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-foreground">{s.student_name}</span>
                    <span className="text-sm text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">{s.subject}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.date}</p>
                  {(() => {
                    const topicRows = parseTopicNotes(s.notes);
                    if (topicRows) {
                      return (
                        <div className="mt-3 overflow-hidden rounded-lg border border-border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Topic</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Rating</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topicRows.map((row, i) => (
                                <tr key={i} className="border-t border-border">
                                  <td className="px-3 py-2 text-foreground">{row.topic}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex justify-end"><Stars count={row.rating} /></div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    return s.notes ? (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.notes}</p>
                    ) : null;
                  })()}
                  {(s.parent_summary || editingSummaryId === s.id) && (
                    <div className="mt-3 rounded-lg bg-accent/50 px-3 py-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground">Parent Summary</p>
                          {s.summary_edited && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium">Edited</Badge>
                          )}
                        </div>
                        {editingSummaryId !== s.id && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Edit summary" onClick={() => startEditSummary(s)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Regenerate with AI" disabled={regenSummaryId === s.id} onClick={() => regenerate(s, "summary")}>
                              {regenSummaryId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </div>
                      {editingSummaryId === s.id ? (
                        <div className="space-y-2">
                          <Textarea value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} rows={4} className="text-sm" />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingSummaryId(null)} disabled={savingSummaryId === s.id}>
                              <X className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                            <Button size="sm" onClick={() => saveSummary(s)} disabled={savingSummaryId === s.id || !summaryDraft.trim()}>
                              {savingSummaryId === s.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">{s.parent_summary}</p>
                      )}
                    </div>
                  )}
                  {s.recommendation && (
                    <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-primary">Ongoing Recommendations</p>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Regenerate recommendations" disabled={regenRecId === s.id} onClick={() => regenerate(s, "recommendation")}>
                          {regenRecId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.recommendation}</p>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex gap-1 mb-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteSession(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
          {hasMore && selectedStudent === "all" && (
            <div className="pt-2 flex justify-center">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Loading…</>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editSession} onOpenChange={(open) => { if (!open) setEditSession(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          {editSession && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{editSession.student_name}</span> · {editSession.subject}
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <StarRating label="Effort" value={editEffort} onChange={setEditEffort} />
                <StarRating label="Understanding" value={editUnderstanding} onChange={setEditUnderstanding} />
                <StarRating label="Engagement" value={editEngagement} onChange={setEditEngagement} />
              </div>
              <Button type="submit" className="w-full" disabled={editSubmitting}>
                {editSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSession} onOpenChange={(open) => { if (!open) setDeleteSession(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the session for <span className="font-medium">{deleteSession?.student_name}</span> on {deleteSession?.date}? This cannot be undone.
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
