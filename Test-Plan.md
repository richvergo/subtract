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

- **Permission middleware**  
  - Role validation (ADMIN, MANAGER, EMPLOYEE).  
  - Entity access validation.  
  - Cross-entity access prevention.  

---

## Integration Tests

- **Registration API**  
  - Creates new user with hashed password.  
  - Rejects duplicate email.  

- **Login API**  
  - Valid credentials → session created with memberships.  
  - Invalid credentials → 401.  
  - Session includes active entity.  

- **Entity Management APIs**  
  - `POST /api/entities` → creates entity (Admin only).  
  - `POST /api/entities/[id]/invite` → invites user (Admin only).  
  - `PATCH /api/memberships/[id]` → updates role (Admin only).  
  - `DELETE /api/memberships/[id]` → removes user (Admin only).  

- **Entity Switching**  
  - `POST /api/auth/switch-entity` → switches active entity.  
  - Validates user has access to target entity.  

- **Checklist CRUD (Entity-Scoped)**  
  - Create, read, update, delete checklist items within entity.  
  - Create, read, update, delete tasks within checklist items.  
  - Admin can edit checklist items (title, assignee, due date, status).  
  - Quick status changes for checklist items and tasks.  
  - Data isolation between entities.  

- **Dashboard API (Entity-Scoped)**  
  - `GET /api/dashboard` → returns data for active entity only.  
  - Auto-creates current month for entity if missing.  
  - Role-based data filtering (Employees see only assigned tasks).  

- **Month management (Entity-Scoped)**  
  - `POST /api/months` → creates month if missing for entity.  
  - `GET /api/months/:id/checklist` → only returns entity's items.  
  - `POST /api/months/generate` → ensures all 12 months exist for current year.  
  - `POST /api/months/copy` → copies checklist items and tasks from previous month.  

- **Clone month (Entity-Scoped)**  
  - Copies checklist + tasks within same entity.  
  - Resets statuses to OPEN.  
  - Rolls due dates forward.  

- **Team Management (Entity-Scoped)**  
  - `GET /api/team-members` → returns team members for active entity.  
  - Role-based ordering (ADMIN, MANAGER, EMPLOYEE).  
  - Used for assignee dropdowns in forms.

- **Export CSV (Entity-Scoped)**  
  - Includes both checklist items and tasks for active entity.  
  - Headers: `Checklist Item, Task, Assignee, Due Date, Status, Notes`.  

---

## E2E Tests (Playwright)

**Multi-Entity Golden Path**  
1. Register an admin user.  
2. Login → system shows no entities message.  
3. Create first entity (Admin only).  
4. System auto-creates current month for entity.  
5. Add first checklist item manually with assignee from team dropdown.  
6. Add tasks to the checklist item with individual assignees.  
7. Mark all but one task DONE → checklist item remains IN_PROGRESS.  
8. Mark last task DONE → checklist item moves to DONE.  
9. Edit checklist item (title, assignee, due date, status).  
10. Use quick status changes for tasks.  
11. Navigate between months using month dropdown.  
12. System auto-generates all 12 months for current year.  
13. Copy checklist items from previous month to future months.  
14. Dashboard reflects progress correctly.  

**User Invitation Flow**  
1. Admin creates entity.  
2. Admin invites manager user.  
3. Manager logs in → sees entity in switcher.  
4. Manager can see all data but cannot manage users.  
5. Admin invites employee user.  
6. Employee logs in → sees only assigned tasks.  

**Entity Switching Flow**  
1. User belongs to multiple entities.  
2. User can switch between entities via dropdown.  
3. Dashboard updates to show data for active entity.  
4. Data isolation maintained between entities.  

**Role-Based Access Flow**  
1. Admin can create entities and invite users.  
2. Manager can see all data but cannot manage users.  
3. Employee can only see tasks assigned to them.  
4. Unauthorized access attempts are blocked.  

**Month Navigation Flow**  
1. User can switch between months using dropdown in page title.  
2. Page title shows current month name (e.g., "September 2025").  
3. System automatically creates all 12 months for current year.  
4. Future months can copy checklist items from previous month.  
5. Month dropdown shows all available months for entity.

**Other Flows**  
- First-time user with no entities sees contact admin message.  
- Returning user lands on current month with existing data for active entity.  
- Cross-entity access attempts are blocked.  
- Entity switcher shows correct roles and permissions.  
- Team member dropdowns show users from active entity only.  

---

## Fixtures

- Test data for multi-entity scenarios  
  - Sample entities with different user roles.  
  - Sample checklist items with various statuses per entity.  
  - Sample tasks with different assignees and due dates.  
  - Role-based test scenarios (Admin/Manager/Employee).  

---

## CI Gates

- ✅ Lint must pass  
- ✅ Typecheck must pass  
- ✅ Unit tests must pass  
- ✅ Integration tests must pass  
- ✅ Golden path E2E must pass  
- ✅ Multi-entity E2E must pass  
- ✅ Role-based access E2E must pass  
- ✅ Build must succeed  
