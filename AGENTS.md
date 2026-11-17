# Architecture
- Shared calendars read a restricted database view for parents so private tutor notes never leave the database.
- Session requests are approved atomically by database functions that validate child linkage and tutor ownership.
- In-app reminders derive from scheduled session timestamps; email delivery must use configured Lovable Emails infrastructure.