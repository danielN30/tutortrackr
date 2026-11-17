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
1. **Shared calendar and session reminders** (in progress)
   - Parents see their children's sessions and request additional sessions; tutors approve or decline
   - Reminders for both parents and tutors; email delivery requires a configured sender domain
2. **Drag-and-drop rescheduling** on the calendar (not implemented yet)
3. **Google Calendar sync-ready structure** (not implemented yet)
4. **Invoice / billing** (mentioned in an earlier brief, never built)
5. Filter calendar by student (partially there — verify)

## Done this round
- Parent portal: multiple children with a child switcher, one query for all their
  sessions, Improving / Steady / Needs-attention trend chip, mobile-friendly
  stat cards and report cards
- Students page: pending invite now shows "Invite sent" with Resend and Remove

## Notes
- Parent portal view itself has not been opened as a parent account — the
  sign-in for the parent account was declined.
