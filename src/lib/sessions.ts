export interface Session {
  id: string;
  studentName: string;
  subject: string;
  date: string;
  notes: string;
  effort: number;
  understanding: number;
  engagement: number;
}

const STORAGE_KEY = "tutortrack_sessions";

export function getSessions(): Session[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addSession(session: Omit<Session, "id">): Session {
  const sessions = getSessions();
  const newSession: Session = { ...session, id: crypto.randomUUID() };
  sessions.unshift(newSession);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  return newSession;
}
