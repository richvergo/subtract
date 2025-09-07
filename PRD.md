# Product Requirements Document (PRD)

## Problem & User
- **User:** Accounting Manager
- **Problem:** Monthly book close checklists are managed in Excel, making it hard to track progress, see history, or drill down into granular blocking tasks.  

---

## User Experience (MVP)

### First Login
1. User registers & logs in.  
2. System automatically creates a MonthClose for the current month (e.g. `2025-09`) if none exists.  
3. User sees an empty dashboard with a "Add Your First Checklist Item" button to start building their checklist manually.  

### Returning Login
1. User lands on **current month’s checklist** by default.  
2. They can navigate:  
   - **Backwards** → view previous months.  
   - **Forwards** → create/copy future months.  

### Checklist vs. Tasks Hierarchy
- **Checklist Item** = Top-level close process step (e.g. *Credit Card Reconciliation*, *AP Review*).  
- **Task** = Sub-actions required to complete a checklist item (e.g. “Attach receipt for Chase transaction #12345”).  

### Behavior
- A checklist item can contain **0..N tasks**.  
- A checklist item is marked `DONE` **only if all its tasks are marked DONE**.  
- Even one incomplete task → checklist item = `OPEN` → book close remains blocked.  
- Progress is shown at both levels: checklist completion and task completion.  

---

## Dashboard (MVP)
When user logs in:  
- **Current month’s checklist** is displayed.  
- Table view: `Item, Due Date, Owner, Status`.  
- Each checklist item can expand to show its **tasks**.  
- Progress metrics: % complete, # overdue, # tasks remaining.  
- **Month selector (top bar)** controls which month is displayed.  
- Actions:  
  - `Add Checklist Item`.  
  - `Add Task` (within a checklist item).  
  - `Edit/Delete` checklist items and tasks.  
  - `Clone Previous Month`.  
  - `Export CSV`.  

---

## Data Model

### User
- `id`, `email`, `passwordHash`, `name`, `createdAt`

### MonthClose
- `id`, `userId`, `label (YYYY-MM)`, `startDate`, `endDate`, `createdAt`
- Relation: `checklistItems`

### ChecklistItem
- `id`, `monthId`, `title`, `assignee`, `dueDate`, `status (NOT_STARTED|IN_PROGRESS|DONE)`, `notes`
- Relation: `tasks`

### Task
- `id`, `checklistItemId`, `title`, `assignee`, `dueDate`, `status (NOT_STARTED|IN_PROGRESS|DONE)`, `notes`

---

## Acceptance Criteria
1. User can register & login.  
2. First-time login automatically creates current month and shows empty dashboard.  
3. User can manually add checklist items and tasks through the dashboard.  
4. System creates a **MonthClose** for current month on first login.  
5. Returning login → system defaults to current month.  
6. User can update task status (`NOT_STARTED`, `IN_PROGRESS`, `DONE`).  
7. Checklist item automatically moves to `DONE` only if all tasks are done.  
8. Progress bar updates correctly at both checklist + task level.  
9. User can navigate between months.  
10. "Clone previous month" creates a new checklist with rolled dates.  
11. Export CSV includes checklist items and tasks with status.  
12. Users only see their own data.  

---

## Out of Scope (MVP)
- Notifications/reminders.  
- Slack/email integrations.  
- PDF export.  
- Multi-workspace / multi-user assignment.  
- Mobile app.  
