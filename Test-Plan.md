# Test Plan

## Unit Tests (Vitest)

- **Auth schemas**  
  - Reject invalid emails and short passwords.  

- **Date utilities**  
  - Rollover edge cases (Jan 31 → Feb 28, etc).  

- **Checklist/Task hierarchy**  
  - Checklist item marked DONE only if all tasks are DONE.  
  - Checklist reverts to OPEN if a task is reopened.  

- **Manual checklist creation**  
  - Checklist items can be created with required fields.  
  - Tasks can be added to checklist items.  

---

## Integration Tests

- **Registration API**  
  - Creates new user with hashed password.  
  - Rejects duplicate email.  

- **Login API**  
  - Valid credentials → session created.  
  - Invalid credentials → 401.  

- **Checklist CRUD**  
  - Create, read, update, delete checklist items.  
  - Create, read, update, delete tasks within checklist items.  

- **Month management**  
  - `POST /api/months` → creates month if missing.  
  - `GET /api/months/:id/checklist` → only returns current user’s items.  

- **Clone month**  
  - Copies checklist + tasks.  
  - Resets statuses to OPEN.  
  - Rolls due dates forward.  

- **Export CSV**  
  - Includes both checklist items and tasks.  
  - Headers: `Checklist Item, Task, Assignee, Due Date, Status, Notes`.  

---

## E2E Tests (Playwright)

**Golden Path**  
1. Register a user.  
2. Login.  
3. System auto-creates current month.  
4. Add first checklist item manually.  
5. Add tasks to the checklist item.  
6. Mark all but one task DONE → checklist item remains IN_PROGRESS.  
7. Mark last task DONE → checklist item moves to DONE.  
8. Update assignees and due dates.  
9. Dashboard reflects progress correctly.  

**Other Flows**  
- First-time user sees empty dashboard with "Add Your First Checklist Item" button.  
- Returning user lands on current month with existing data.  
- Unauthorized user cannot access another user's checklist.  

---

## Fixtures

- Test data for manual checklist creation  
  - Sample checklist items with various statuses.  
  - Sample tasks with different assignees and due dates.  

---

## CI Gates

- ✅ Lint must pass  
- ✅ Typecheck must pass  
- ✅ Unit tests must pass  
- ✅ Integration tests must pass  
- ✅ Golden path E2E must pass  
- ✅ Build must succeed  
