# TutorTrackr Roadmap

## Done
- Calendar (weekly + monthly), schedule session dialog, session detail + complete flow
- Student CRUD (add / edit / delete), student profile page with charts + PDF export
- Session history with pagination, edit/regenerate summaries & recommendations, topic star table
- Parent portal: invite by email, parent role, child-only view (no tutor private notes)
- Onboarding tour (first login) + Restart Tour in Settings
- Security: RLS scoped per tutor, input sanitisation, JWT-verified AI function, breach-password check
- Performance: error boundary, skeleton screens, dashboard student cache, 30s AI timeout
- Design: navy/teal SaaS UI, Inter, fixed sidebar, logo + favicon

## Open
1. **Parent portal polish** (chosen — do first)
   - Multiple children support (currently limited to one student per parent)
   - Progress over time view for parents, cleaner mobile layout
   - Email invite delivery check + resend / revoke invites
2. **Session reminders** (chosen — do second)
   - Notify tutors before an upcoming session starts
3. **Drag-and-drop rescheduling** on the calendar (not implemented yet)
4. **Google Calendar sync-ready structure** (not implemented yet)
5. **Invoice / billing** (mentioned in an earlier brief, never built)
6. Filter calendar by student (partially there — verify)

## Notes
- `src/routes/parent.tsx` uses `.limit(1)` on the child lookup — one child only.
