# Product Requirements Document (PRD)

## Problem & User
- **User:** Accounting Manager at Legal Entities/Companies
- **Problem:** Monthly book close checklists are managed in Excel, making it hard to track progress, see history, or drill down into granular blocking tasks across multiple legal entities.  

---

## Multi-Entity Architecture

### Entity Management
- **Entity** = Legal company/organization (e.g. "Acme Corp", "Subsidiary LLC")
- **Multi-Tenancy**: Each entity has completely isolated data and users
- **Entity Creation**: Only ADMIN users can create new entities
- **Entity Switching**: Users can switch between entities they belong to

### Role-Based Access Control (RBAC)
- **ADMIN**: Can create entities, invite/remove users, manage billing, see all data
- **MANAGER**: Can see all data within entity, cannot manage users
- **EMPLOYEE**: Can only see tasks assigned to them

### User Experience (MVP)

#### First Login
1. User registers & logs in.  
2. If user has no entity memberships, they see a message to contact an admin
3. System automatically creates a MonthClose for the current month (e.g. `2025-09`) for their active entity if none exists.  
4. User sees an empty dashboard with a "Add Your First Checklist Item" button to start building their checklist manually.  

#### Returning Login
1. User lands on **current month's checklist** for their active entity by default.  
2. They can navigate:  
   - **Backwards** → view previous months for the same entity.  
   - **Forwards** → create/copy future months for the same entity.  
   - **Entity Switcher** → switch between entities they belong to
3. System automatically ensures all 12 months exist for the current year.
4. Future months automatically copy checklist items from the previous month if empty.

#### Checklist vs. Tasks Hierarchy
- **Checklist Item** = Top-level close process step (e.g. *Credit Card Reconciliation*, *AP Review*).  
- **Task** = Sub-actions required to complete a checklist item (e.g. "Attach receipt for Chase transaction #12345").  

#### Behavior
- A checklist item can contain **0..N tasks**.  
- A checklist item is marked `DONE` **only if all its tasks are marked DONE**.  
- Even one incomplete task → checklist item = `OPEN` → book close remains blocked.  
- Progress is shown at both levels: checklist completion and task completion.  
- **Data Isolation**: Users only see data for their active entity

---

## Dashboard (MVP)
When user logs in:  
- **Entity Switcher** in sidebar shows available entities and user's role
- **Current month's checklist** for active entity is displayed.  
- **Month Navigation**: Page title shows current month (e.g., "September 2025") with dropdown to switch months.
- Table view: `Item, Assignee, Due Date, Status, Actions`.  
- Each checklist item can expand to show its **tasks**.  
- Progress metrics: % complete, # overdue, # tasks remaining.  
- **Team Member Dropdowns**: Assignee fields show team members from active entity.
- Actions:  
  - `Add Checklist Item` with assignee selection.  
  - `Add Task` (within a checklist item) with individual assignee.  
  - `Edit` checklist items (title, assignee, due date, status).  
  - `Quick Status Change` dropdowns for checklist items and tasks.  
  - `Delete` tasks.  
  - `Clone Previous Month`.  
  - `Export CSV`.  

---

## Data Model

### User
- `id`, `email`, `passwordHash`, `name`, `createdAt`
- Relation: `memberships`

### Entity
- `id`, `name`, `createdAt`
- Relations: `memberships`, `months`

### Membership
- `id`, `userId`, `entityId`, `role (ADMIN|MANAGER|EMPLOYEE)`
- Relations: `user`, `entity`
- Unique constraint: `(userId, entityId)`

### MonthClose
- `id`, `entityId`, `label (YYYY-MM)`, `startDate`, `endDate`, `createdAt`
- Relations: `entity`, `checklistItems`
- Unique constraint: `(entityId, label)`

### ChecklistItem
- `id`, `monthId`, `title`, `owner`, `assignee`, `dueDate`, `status (NOT_STARTED|IN_PROGRESS|DONE)`, `notes`
- Relations: `month`, `tasks`

### Task
- `id`, `checklistItemId`, `title`, `assignee`, `dueDate`, `status (NOT_STARTED|IN_PROGRESS|DONE)`, `notes`
- Relations: `checklistItem`

---

## Acceptance Criteria
1. User can register & login.  
2. First-time login automatically creates current month for active entity and shows empty dashboard.  
3. User can manually add checklist items and tasks through the dashboard.  
4. System creates a **MonthClose** for current month on first login per entity.  
5. Returning login → system defaults to current month for active entity.  
6. User can update task status (`NOT_STARTED`, `IN_PROGRESS`, `DONE`).  
7. Checklist item automatically moves to `DONE` only if all tasks are done.  
8. Progress bar updates correctly at both checklist + task level.  
9. User can navigate between months within the same entity using month dropdown.  
10. Page title displays current month name (e.g., "September 2025").  
11. System automatically creates all 12 months for current year.  
12. Future months automatically copy checklist items from previous month if empty.  
13. Admins can edit checklist items (title, assignee, due date, status).  
14. Quick status change dropdowns for both checklist items and tasks.  
15. Team member dropdowns show users from active entity only.  
16. "Clone previous month" creates a new checklist with rolled dates for the same entity.  
17. Export CSV includes checklist items and tasks with status for the active entity.  
18. **Multi-Entity Security**: Users only see data for entities they belong to.  
19. **Role-Based Access**: Employees only see tasks assigned to them.  
20. **Entity Management**: Admins can create entities and invite users.  
21. **Entity Switching**: Users can switch between entities they belong to.  

---

## Out of Scope (MVP)
- Notifications/reminders.  
- Slack/email integrations.  
- PDF export.  
- Mobile app.  
- Cross-entity reporting or analytics.  
