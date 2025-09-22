Tech Stack

Frontend: Next.js 15 (App Router) + React 19 + TypeScript

Styling: Custom CSS classes in globals.css + inline styles (no Tailwind/shadcn for MVP)

Data Fetching: SWR for caching and real-time updates

UI Components: Custom components (Sidebar, Buttons, Cards) with inline styles

Auth: NextAuth (credentials provider: email + password)

Database: Prisma (SQLite for dev, Postgres for prod)

Validation: Zod

Background Jobs: Redis + BullMQ + worker for agent processing/runs

Testing: Jest (unit/integration) with comprehensive Puppeteer + LLM mocking

Core Concepts
Agents

Definition: Repeatable workflows learned from a user recording.

Storage:

agent_config = structured DOM actions with metadata

purpose_prompt = user’s natural language description of the task

agent_intents = LLM annotations for each step

States:

DRAFT = created but not confirmed

ACTIVE = tested + confirmed, can run with parameters

Logins

Definition: Secure vault of credentials + sessions for external systems.

Features:

Per-login refresh/reconnect

Status: Active, Needs Reconnect, Disconnected

MFA/2FA handled at reconnect time

Security: AES-256 encryption, session reuse prioritized

Runs

Definition: An execution of an agent with specific parameters.

Features:

Uses agent_config to replay steps

If selectors fail, falls back to agent_intents + LLM repair

Captures logs + screenshots

Stores params_used for auditability

Golden Path UX

User clicks Create Agent → opens recording page

User records workflow, enters purpose prompt, saves agent

Backend processes in single step → generates structured steps + intent annotations via /api/agents/record

System detects domains → prompts for logins if required

Agent saved in DRAFT until tested

User runs a test → reviews logs/screenshots → confirms

Agent marked ACTIVE → available for repeat runs with parameters

Folder Structure
/src
  /app
    /agents           # Agent pages (list, detail, create)
    /logins           # Login pages
    /api              # API routes
      /agents         # Agent CRUD, create-from-recording, runs
      /logins         # Login CRUD, check/reconnect
      /agent-runs     # Run confirmation/rejection
    /register         # User registration
    layout.tsx        # Root layout with sidebar
    page.tsx          # Dashboard
  /components         # Shared UI (sidebar, modals, forms)
  /lib                # DB client, auth, helpers
  /schemas            # Zod validation schemas
/tests                # Unit, integration, and E2E tests
/prisma               # DB schema + migrations

Data Model Rules

User → has multiple Agents and Logins

Agent → belongs to a user; stores config, intents, purpose prompt, status

Login → belongs to a user; stores encrypted credentials and session info

AgentRun → belongs to an agent; stores params, logs, screenshot, status

Environment

File: /src/lib/env.ts

Validates required variables:

DATABASE_URL

NEXTAUTH_SECRET

NEXTAUTH_URL

NODE_ENV

INTERNAL_RUNNER_TOKEN

App must crash at startup if missing or invalid.

Error Handling

APIs return application/problem+json errors.

Never leak stack traces to client.

Errors must include a user-friendly message and any missing prerequisites (e.g. “Login required for domain X”).

Naming Conventions

DB models: PascalCase (User, Agent, Login, AgentRun)

DB fields: camelCase (agentConfig, purposePrompt, sessionData)

TS code: camelCase

Files/folders: kebab-case

Commits: Conventional commits (feat:, fix:, chore:)

Testing Strategy

Unit Tests (Jest):

Zod schemas reject invalid input

Agent recorder produces metadata-rich steps

LLM annotator generates intents correctly

Runner executes selectors or falls back to repair

Integration Tests:

API endpoints (agents, logins, runs) handle happy + failure paths

Agent creation with/without login required

Run blocked if missing login

Run repair triggered if selector fails

Mocking Strategy:

Puppeteer: Comprehensive mocking of browser automation

LLM Service: Mocked responses for intent generation

Redis Queue: Mocked for background job processing

CI Gates:

Lint ✅

Typecheck ✅

Unit tests ✅

Integration tests ✅

Build ✅

Areas Needing Product Decisions:

Session Reuse / 2FA: Current = manual reconnect; confirm if automatic re-auth desired

Agent Creation UX: Current = single-step; confirm if UX should later split

Testing Strategy: Current = mocks only; confirm if real browser integration tests needed

Error Handling: Current = basic errors; confirm if retry logic required

Git & Version Control

Branching:

main = stable

Feature branches for all new work

Commits:

Small, descriptive, conventional commit messages

Tags:

Tag major milestones (e.g. agents-mvp-ready)

Do-Not-Do (MVP)

❌ Notifications/reminders

❌ Slack/email integrations

❌ Scheduling/recurrence (belongs to Tasks section, not Agents MVP)

❌ Mobile app

❌ Cross-user agent sharing

✅ This version is focused on Agents, Logins, and Runs — the core MVP functionality.