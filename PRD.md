# Product Requirements Document (PRD)

## Problem & User
- **User:** Accounting Manager
- **Problem:** Monthly book close checklists in Excel lack tracking, ownership clarity, and history.

## Single Happy Path (MVP)
1. Register & login.
2. Upload Excel/CSV checklist with Task, Owner, Due Date.
3. Map headers, preview, confirm.
4. App creates “Month Close YYYY-MM” with tasks.
5. User marks tasks DONE/OPEN, adds notes.
6. Clone to next month.
7. Export CSV summary.

## Acceptance Criteria
1. New user registers, logs in, sees empty dashboard.
2. Upload creates tasks for a month; requires ≥1 valid row.
3. Column mapping works with non-standard headers.
4. DONE persists across reloads.
5. Dashboard shows total, completed, overdue, %.
6. Clone rolls due dates to same day-of-month (or clamps to month end).
7. CSV export downloads with all tasks + statuses.
8. Users only see their own data.

## Out of Scope (MVP)
- SSO, notifications, Slack/email, PDFs, multi-org, mobile.
