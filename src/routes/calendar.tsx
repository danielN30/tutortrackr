import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "../components/AppHeader";
import { ScheduleSessionDialog } from "../components/ScheduleSessionDialog";
import { SessionDetailDialog } from "../components/SessionDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  getMonthDays,
  getWeekDays,
  formatDate,
  formatTime,
  MONTH_NAMES,
} from "../lib/calendar-utils";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — TutorTrack" },
      { name: "description", content: "View and schedule tutoring sessions on the calendar." },
    ],
  }),
  component: CalendarPage,
});

interface CalendarSession {
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

interface StudentFilter {
  id: string;
  name: string;
}

function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string | undefined>();
  const [detailSession, setDetailSession] = useState<CalendarSession | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [studentFilter, setStudentFilter] = useState("all");
  const [students, setStudents] = useState<StudentFilter[]>([]);

  const today = formatDate(new Date());

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    loadData();
  }, [user, authLoading, navigate]);

  async function loadData() {
    setLoading(true);
    const [sessionsRes, studentsRes] = await Promise.all([
      supabase.from("sessions").select("*").order("date", { ascending: true }),
      supabase.from("students").select("id, name").order("name"),
    ]);
    setSessions((sessionsRes.data as CalendarSession[]) ?? []);
    setStudents(studentsRes.data ?? []);
    setLoading(false);
  }

  const filteredSessions = useMemo(() => {
    if (studentFilter === "all") return sessions;
    return sessions.filter((s) => s.student_id === studentFilter);
  }, [sessions, studentFilter]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const s of filteredSessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [filteredSessions]);

  function navigateCalendar(dir: number) {
    const next = new Date(currentDate);
    if (view === "month") {
      next.setMonth(next.getMonth() + dir);
    } else {
      next.setDate(next.getDate() + dir * 7);
    }
    setCurrentDate(next);
  }

  function openSchedule(date?: string) {
    setScheduleDate(date);
    setScheduleOpen(true);
  }

  function openDetail(session: CalendarSession) {
    setDetailSession(session);
    setDetailOpen(true);
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigateCalendar(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground min-w-[180px] text-center">
              {view === "month"
                ? `${MONTH_NAMES[month]} ${year}`
                : (() => {
                    const days = getWeekDays(currentDate);
                    return `${days[0].date} — ${days[6].date}`;
                  })()}
            </h1>
            <Button variant="ghost" size="icon" onClick={() => navigateCalendar(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border border-border">
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setView("week")}
              >
                Week
              </Button>
              <Button
                variant={view === "month" ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setView("month")}
              >
                Month
              </Button>
            </div>
            <Button size="sm" onClick={() => openSchedule()}>
              <Plus className="h-4 w-4 mr-1" /> Schedule
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : view === "month" ? (
          <MonthView
            year={year}
            month={month}
            today={today}
            sessionsByDate={sessionsByDate}
            onDayClick={openSchedule}
            onSessionClick={openDetail}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            today={today}
            sessionsByDate={sessionsByDate}
            onSlotClick={openSchedule}
            onSessionClick={openDetail}
          />
        )}
      </main>

      <ScheduleSessionDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaultDate={scheduleDate}
        userId={user.id}
        onCreated={loadData}
      />

      <SessionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        session={detailSession}
        onUpdated={loadData}
      />
    </div>
  );
}

/* ── Month View ── */
function MonthView({
  year,
  month,
  today,
  sessionsByDate,
  onDayClick,
  onSessionClick,
}: {
  year: number;
  month: number;
  today: string;
  sessionsByDate: Map<string, CalendarSession[]>;
  onDayClick: (date: string) => void;
  onSessionClick: (s: CalendarSession) => void;
}) {
  const days = getMonthDays(year, month);
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-7">
          {dayHeaders.map((d) => (
            <div key={d} className="border-b border-border px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {days.map((day, i) => {
            const daySessions = sessionsByDate.get(day.date) ?? [];
            const isToday = day.date === today;
            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-border p-1.5 cursor-pointer transition-colors hover:bg-accent/30 ${
                  !day.isCurrentMonth ? "bg-muted/30" : ""
                }`}
                onClick={() => onDayClick(day.date)}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-primary text-primary-foreground font-bold"
                      : day.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {day.dayNum}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {daySessions.slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); onSessionClick(s); }}
                      className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white transition-opacity hover:opacity-80 ${
                        s.status === "scheduled" ? "bg-session-scheduled" : "bg-session-completed"
                      }`}
                    >
                      {formatTime(s.start_time)} {s.student_name}
                    </button>
                  ))}
                  {daySessions.length > 3 && (
                    <p className="text-[10px] text-muted-foreground pl-1">
                      +{daySessions.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Week View ── */
function WeekView({
  currentDate,
  today,
  sessionsByDate,
  onSlotClick,
  onSessionClick,
}: {
  currentDate: Date;
  today: string;
  sessionsByDate: Map<string, CalendarSession[]>;
  onSlotClick: (date: string) => void;
  onSessionClick: (s: CalendarSession) => void;
}) {
  const days = getWeekDays(currentDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px]">
          {/* Header row */}
          <div className="border-b border-r border-border" />
          {days.map((d) => (
            <div
              key={d.date}
              className={`border-b border-r border-border px-2 py-2 text-center ${
                d.isToday ? "bg-primary/5" : ""
              }`}
            >
              <p className="text-xs text-muted-foreground">{d.dayName}</p>
              <p
                className={`text-sm font-medium ${
                  d.isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {d.dayNum}
              </p>
            </div>
          ))}

          {/* Time slots */}
          {hours.map((hour) => (
            <>
              <div
                key={`label-${hour}`}
                className="border-b border-r border-border px-2 py-3 text-right text-xs text-muted-foreground"
              >
                {hour > 12 ? hour - 12 : hour}{hour >= 12 ? "pm" : "am"}
              </div>
              {days.map((d) => {
                const daySessions = sessionsByDate.get(d.date) ?? [];
                const hourSessions = daySessions.filter((s) => {
                  if (!s.start_time) return false;
                  const h = parseInt(s.start_time.split(":")[0], 10);
                  return h === hour;
                });
                return (
                  <div
                    key={`${d.date}-${hour}`}
                    className={`border-b border-r border-border min-h-[48px] p-0.5 cursor-pointer hover:bg-accent/20 transition-colors ${
                      d.isToday ? "bg-primary/5" : ""
                    }`}
                    onClick={() => onSlotClick(d.date)}
                  >
                    {hourSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => { e.stopPropagation(); onSessionClick(s); }}
                        className={`w-full truncate rounded px-1 py-0.5 text-[11px] font-medium text-white mb-0.5 text-left hover:opacity-80 ${
                          s.status === "scheduled" ? "bg-session-scheduled" : "bg-session-completed"
                        }`}
                      >
                        {s.student_name} ({s.duration_minutes}m)
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
