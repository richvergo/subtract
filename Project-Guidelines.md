# Project Guidelines

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind + shadcn/ui
- Prisma (SQLite dev, Postgres prod)
- NextAuth (Credentials, email+password)
- Zod validation
- SheetJS (xlsx parsing)
- Vitest + Playwright

## Folder Structure (locked)
/app (routes)
/app/api (handlers)
/components (UI)
/lib (db, env, auth, utils)
/schemas (Zod)
/tests/{unit,e2e,fixtures}
/prisma/schema.prisma

## Environment
- `/lib/env.ts` validates `DATABASE_URL`, `NEXTAUTH_SECRET`, `NODE_ENV`.
- App must crash if missing.

## Errors
- API routes return `problem+json`.
- No leaking stack traces.

## Naming
- snake_case for DB
- camelCase for TypeScript
- kebab-case for filenames

## Git & Commits
- Conventional commits: `feat:`, `fix:`, `chore:` etc.

## Testing Policy
- Each new API route requires:
  - Zod schema unit test
  - At least one E2E touch

## Do-Not-Do (MVP)
- PDFs
- Notifications
- SSO
- Multi-workspace
