# Test Plan

## Unit Tests (Vitest)
- Zod schemas reject invalid input.
- Date util: roll Feb 28 → Mar 28 (clamp if shorter).
- Upload parser: at least one row required.

## Integration Tests
- Auth register/login → session cookie persists.
- Upload ingest: valid file creates tasks; invalid headers → 400.

## E2E Tests (Playwright)
1. Register & login.
2. Upload fixture checklist, map headers.
3. Create “2025-09” month, tasks visible.
4. Toggle one task DONE, reload, persists.
5. Clone to next month, tasks copied with rolled due dates.
6. Export CSV, file downloads, has correct headers.

## Fixtures
- `/tests/fixtures/sample_checklist.xlsx` (10 tasks, 3 owners, due dates).
- `/tests/fixtures/bad_headers.xlsx` (wrong headers).

## CI Gates
- Lint
- Typecheck
- Unit tests
- Golden-path E2E
- Build
