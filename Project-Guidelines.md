# Project Guidelines

## Tech Stack
- **Frontend:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind + shadcn/ui
- **Auth:** NextAuth (Credentials provider, email+password) with multi-entity support
- **Database:** Prisma (SQLite for dev, Postgres for prod)
- **Validation:** Zod
- **File Parsing:** Removed (manual creation only)
- **Testing:** Vitest (unit/integration) + Playwright (E2E)

---

## Multi-Entity Architecture

### Entity Management
- **Entity** = Legal company/organization with isolated data
- **Multi-Tenancy**: Complete data isolation between entities
- **Entity Creation**: Only ADMIN users can create entities
- **Entity Switching**: Users can switch between entities they belong to

### Role-Based Access Control (RBAC)
- **ADMIN**: Can create entities, invite/remove users, manage billing, see all data
- **MANAGER**: Can see all data within entity, cannot manage users
- **EMPLOYEE**: Can only see tasks assigned to them

### Security Rules
- All API endpoints must check entity access permissions
- Data queries must be filtered by active entity
- Session includes user memberships and active entity
- Role-based UI elements and functionality

---

## Folder Structure (locked)
/src/app # App Router pages and API
/api # Backend endpoints
  /auth # Auth (register, login, session, switch-entity)
  /entities # Entity management (create, invite users)
  /memberships # Membership management (update roles, remove users)
  /checklist # Checklist management (entity-scoped)
  /dashboard # Dashboard data (entity-scoped)
  /tasks # Task management (entity-scoped)
/register # Registration page
/page.tsx # Dashboard (home) with entity switcher
/layout.tsx # Root layout with sidebar
/components # UI components
  Sidebar.tsx # Navigation with entity switcher
  EntitySwitcher.tsx # Entity selection dropdown
  LayoutWithSidebar.tsx # Layout wrapper
  EnhancedDashboardContent.tsx # Dashboard with CRUD
  StatusBadge.tsx # Status indicators
  StatusSelect.tsx # Status dropdowns
  Providers.tsx # NextAuth session provider

/src/lib # Shared utilities
db.ts # Prisma client
auth.ts # Session helper
permissions.ts # RBAC middleware and helpers

/src/schemas # Zod schemas

/tests # Tests
/unit
/integration
/e2e

/prisma # Database schema + migrations

---

## Data Model Rules
- **User** → has multiple `Membership` entries across entities
- **Entity** → legal company/organization with isolated data
- **Membership** → links users to entities with roles (ADMIN/MANAGER/EMPLOYEE)
- **MonthClose** → belongs to an entity; represents one accounting month
- **ChecklistItem** → belongs to a month; represents a high-level close step
- **Task** → belongs to a checklist item; represents granular work
- **Constraint:** A checklist item is marked `DONE` only if all its tasks are marked `DONE`
- **Security:** All data access must be entity-scoped and role-checked

---

## Environment
- File: `/src/lib/env.ts`
- Validates required variables:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `NODE_ENV`
- App must crash at startup if missing or invalid.

---

## Error Handling
- API routes return `application/problem+json` style errors.
- Never leak stack traces to client.
- Always provide user-friendly error messages.
- Include entity access validation in all endpoints.

---

## Naming Conventions
- **Database models:** PascalCase (`User`, `Entity`, `Membership`, `MonthClose`, `ChecklistItem`, `Task`)
- **DB fields:** camelCase (`userId`, `entityId`, `dueDate`)
- **TypeScript code:** camelCase
- **Files/folders:** kebab-case
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`)

---

## Testing Strategy
- **Unit tests (Vitest):**
  - Zod schemas reject invalid input.
  - Date utils handle rollovers (Jan 31 → Feb 28).
  - Checklist item toggles DONE only if all tasks are DONE.
  - Permission middleware validates roles correctly.

- **Integration tests:**
  - API endpoints handle happy-path + failure cases.
  - Manual checklist creation and task management.
  - Cloning rolls due dates and resets statuses.
  - Entity creation and user invitation flows.
  - Role-based access control enforcement.

- **E2E tests (Playwright):**
  - Golden path: register → login → auto-create month → add checklist item → add tasks → update statuses → assign users → dashboard reflects progress.
  - Multi-entity path: create entity → invite users → switch entities → verify data isolation.
  - Role-based path: test ADMIN/MANAGER/EMPLOYEE permissions.
  - Negative tests: invalid login, unauthorized access, cross-entity access attempts.

- **Fixtures:**
  - Test data for manual checklist creation.
  - Sample entities, users, and memberships for testing.
  - Role-based test scenarios.

- **CI Gates:**
  - Lint ✅
  - Typecheck ✅
  - Unit tests ✅
  - Integration tests ✅
  - Golden path E2E ✅
  - Multi-entity E2E ✅
  - Build ✅

- **Rule:** No new feature is "done" unless it has a test.

---

## Git & Version Control
- **Branching:** 
  - `main` = stable working branch.
  - Feature branches for all new work.
- **Commits:** 
  - Small, frequent commits with descriptive messages.
- **Tags:** 
  - Tag major milestones (e.g. `auth-working`, `multi-entity-working`).

---

## Do-Not-Do (MVP)
- ❌ Notifications/reminders
- ❌ Slack/email integrations
- ❌ PDF export
- ❌ Mobile app
- ❌ Cross-entity reporting or analytics