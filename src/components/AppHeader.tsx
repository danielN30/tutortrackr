import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">TutorTrack</span>
        </Link>
        <nav className="flex gap-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log Session
          </Link>
          <Link
            to="/dashboard"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
