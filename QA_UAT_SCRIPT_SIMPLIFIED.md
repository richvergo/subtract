# QA/UAT Script - Simplified Critical Path Testing
## vergo AI Agents Platform | Frontend: agents-frontend-stable-v1 | Backend: agents-backend-stable-v3

**Version**: 1.0 (Simplified)  
**Date**: January 2025  
**Estimated Time**: 15-20 minutes  
**Target**: Critical functionality validation

---

## 🚀 Quick Setup

### Test Credentials
- **Email**: `alice@example.com`
- **Password**: `password123`

### Prerequisites
- Application running on `http://localhost:3000`
- Browser with developer tools access

---

## ✅ Critical Path Tests (5 Tests)

### Test 1: Login & Dashboard Access
**Time**: 2-3 minutes

**Steps**:
1. Go to `http://localhost:3000`
2. Login with `alice@example.com` / `password123`
3. Verify you see the dashboard with 3 stats cards
4. Check sidebar shows your name and email

**✅ Pass**: Dashboard loads, shows stats, sidebar displays user info

---

### Test 2: View Agents List
**Time**: 2-3 minutes

**Steps**:
1. Click "Agents" in sidebar
2. Verify you see 3 pre-seeded agents in a table
3. Check that agent names are clickable links
4. Verify "Create Agent" button is visible

**✅ Pass**: Agents list displays correctly with clickable names

---

### Test 3: Create New Agent
**Time**: 5-7 minutes

**Steps**:
1. Click "Create Agent" button
2. Fill in form:
   - **Name**: "Test Agent"
   - **Purpose**: "Test automation workflow"
3. Click "Start Recording" → Grant permissions → Click "Stop Recording"
4. Click "Save Agent"
5. Verify you're redirected to agents list
6. Check new agent appears in the list

**✅ Pass**: Agent created successfully and appears in list

---

### Test 4: View & Run Agent
**Time**: 3-4 minutes

**Steps**:
1. Click on any agent name from the list
2. Verify agent detail page loads
3. Click "Run Agent" button
4. Watch the run history table update
5. Verify run appears with status (PENDING → RUNNING → COMPLETED/FAILED)

**✅ Pass**: Agent detail page loads and run executes

---

### Test 5: Manage Logins
**Time**: 3-4 minutes

**Steps**:
1. Click "Logins" in sidebar
2. Verify you see 3 pre-seeded logins
3. Click "Add Login" button
4. Fill in form:
   - **Name**: "Test Login"
   - **URL**: "https://example.com"
   - **Username**: "test@example.com"
   - **Password**: "test123"
5. Click "Create Login"
6. Verify new login appears in table
7. Click "Delete" on the new login
8. Confirm deletion

**✅ Pass**: Login creation and deletion work correctly

---

## 🎯 Quick Validation Checklist

**Core Functionality**:
- [ ] Login works with test credentials
- [ ] Dashboard shows correct stats
- [ ] Agents list displays pre-seeded data
- [ ] Can create new agent with recording
- [ ] Can run agents and see status updates
- [ ] Can add and delete logins
- [ ] Sidebar navigation works
- [ ] No critical errors or crashes

**UI/UX**:
- [ ] Pages load without errors
- [ ] Buttons and links are clickable
- [ ] Forms submit successfully
- [ ] Tables display data correctly
- [ ] Status badges show appropriate colors

---

## 🐛 Quick Issue Reporting

**If something breaks**:
1. **What test**: [Test 1-5]
2. **What happened**: [Brief description]
3. **Screenshot**: [If possible]
4. **Browser**: [Chrome/Firefox/Safari]

---

## ✅ Go/No-Go Decision

**✅ GO** if:
- All 5 tests pass
- No critical errors
- Core functionality works
- UI is responsive

**❌ NO-GO** if:
- Login fails
- Any test fails completely
- Critical errors or crashes
- Data not displaying

---

## 🚀 Ready to Test?

**Start with Test 1** and work through each test sequentially. This simplified script covers the essential user journey and should take about 15-20 minutes to complete.

**Need help?** Check the full QA/UAT script for detailed troubleshooting steps.

---

*This simplified script focuses on the critical path to quickly validate that the core functionality works correctly.*
