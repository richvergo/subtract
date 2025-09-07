# Project Guidelines

## Tech Stack
- **Frontend:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind + shadcn/ui
- **Auth:** NextAuth (Credentials provider, email+password)
- **Database:** Prisma (SQLite for dev, Postgres for prod)
- **Validation:** Zod
- **File Parsing:** Removed (manual creation only)
- **Testing:** Vitest (unit/integration) + Playwright (E2E)

---

## Folder Structure (locked)
/src/app # App Router pages and API
/api # Backend endpoints
/auth # Auth (register, login, session)
/checklist # Checklist management
/months # Month management
/tasks # Task management
/login # Login page
/register # Registration page
# Upload UI removed
/page.tsx # Dashboard (home)
/layout.tsx # Root layout

/src/lib # Shared utilities
db.ts # Prisma client
env.ts # Env validation
auth.ts # Session helper

/src/schemas # Zod schemas

/tests # Tests
/unit
/integration
/e2e
# Test fixtures removed

/prisma # Database schema + migrations

markdown
Copy code

---

## Data Model Rules
- **User** → owns multiple `MonthClose` entries.
- **MonthClose** → represents one accounting month.
- **ChecklistItem** → belongs to a month; represents a high-level close step.
- **Task** → belongs to a checklist item; represents granular work.
- **Constraint:** A checklist item is marked `DONE` only if all its tasks are marked `DONE`.

---

## Environment
- File: `/src/lib/env.ts`
- Validates required variables:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NODE_ENV`
- App must crash at startup if missing or invalid.

---

## Error Handling
- API routes return `application/problem+json` style errors.
- Never leak stack traces to client.
- Always provide user-friendly error messages.

---

## Naming Conventions
- **Database models:** PascalCase (`User`, `MonthClose`, `ChecklistItem`, `Task`)
- **DB fields:** camelCase (`userId`, `dueDate`)
- **TypeScript code:** camelCase
- **Files/folders:** kebab-case
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`)

---

## Testing Strategy
- **Unit tests (Vitest):**
  - Zod schemas reject invalid input.
  - Date utils handle rollovers (Jan 31 → Feb 28).
  - Checklist item toggles DONE only if all tasks are DONE.

- **Integration tests:**
  - API endpoints handle happy-path + failure cases.
  - Manual checklist creation and task management.
  - Cloning rolls due dates and resets statuses.

- **E2E tests (Playwright):**
  - Golden path: register → login → auto-create month → add checklist item → add tasks → update statuses → assign users → dashboard reflects progress.
  - Negative tests: invalid login, unauthorized access.

- **Fixtures:**
  - Test data for manual checklist creation.
  - Sample checklist items and tasks for testing.

- **CI Gates:**
  - Lint ✅
  - Typecheck ✅
  - Unit tests ✅
  - Integration tests ✅
  - Golden path E2E ✅
  - Build ✅

- **Rule:** No new feature is “done” unless it has a test.

---

## Git & Version Control
- **Branching:** 
  - `main` = stable working branch.
  - Feature branches for all new work.
- **Commits:** 
  - Small, frequent commits with descriptive messages.
- **Tags:** 
  - Tag major milestones (e.g. `auth-working`, `upload-working`).

---

## Do-Not-Do (MVP)
- ❌ Notifications/reminders
- ❌ Slack/email integrations
- ❌ PDF export
- ❌ Multi-workspace / multi-user assignment
- ❌ Mobile app