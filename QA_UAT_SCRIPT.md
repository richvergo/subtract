# QA/UAT Script - vergo AI Agents Platform
## Frontend: agents-frontend-stable-v1 | Backend: agents-backend-stable-v3

**Version**: 1.0  
**Date**: January 2025  
**Test Environment**: Manual Testing  
**Target Audience**: QA Testers, Product Managers, Stakeholders

---

## 📋 Pre-Test Setup

### Prerequisites
- Application running on `http://localhost:3000`
- Test data seeded in database
- Browser with developer tools access
- Network connectivity for API calls

### Test Credentials
- **Email**: `alice@example.com`
- **Password**: `password123`

### Test Data Available
- 3 pre-seeded logins (Google Slides, Notion, Airtable)
- 3 pre-seeded agents (2 DRAFT, 1 ACTIVE)
- Sample agent runs with various statuses

---

## 🧪 Test Areas

## 1. Authentication Testing

### Test 1.1: User Login
**Objective**: Verify user can successfully log in with valid credentials

**Steps**:
1. Navigate to `http://localhost:3000`
2. Click "Get Started - Sign Up / Login" or navigate to `/register`
3. Enter email: `alice@example.com`
4. Enter password: `password123`
5. Click "Login" button

**Expected Results**:
- ✅ User is redirected to dashboard (`/`)
- ✅ Sidebar shows user name and email
- ✅ Navigation items are visible and functional
- ✅ No error messages displayed

**Pass Criteria**: User successfully logs in and sees dashboard

---

### Test 1.2: Session Persistence
**Objective**: Verify user session persists across browser refreshes

**Steps**:
1. Complete Test 1.1 (login successfully)
2. Refresh the browser page (F5 or Ctrl+R)
3. Navigate to different pages using sidebar
4. Close and reopen browser tab
5. Navigate back to `http://localhost:3000`

**Expected Results**:
- ✅ User remains logged in after refresh
- ✅ User remains logged in after tab close/reopen
- ✅ Session persists across page navigation
- ✅ User information displays correctly in sidebar

**Pass Criteria**: Session maintained throughout browser interactions

---

### Test 1.3: User Logout
**Objective**: Verify user can successfully log out

**Steps**:
1. Complete Test 1.1 (login successfully)
2. Click "Logout" button in sidebar
3. Verify redirect behavior
4. Try to access protected page directly

**Expected Results**:
- ✅ User is logged out successfully
- ✅ Redirected to registration/login page
- ✅ Attempting to access `/agents` or `/logins` redirects to login
- ✅ Sidebar no longer shows user information

**Pass Criteria**: Clean logout with proper redirects

---

### Test 1.4: Re-login After Logout
**Objective**: Verify user can log back in after logout

**Steps**:
1. Complete Test 1.3 (logout successfully)
2. Navigate to login page
3. Enter same credentials: `alice@example.com` / `password123`
4. Click "Login"

**Expected Results**:
- ✅ User can log back in successfully
- ✅ Redirected to dashboard
- ✅ All functionality restored

**Pass Criteria**: Seamless re-authentication

---

## 2. Agents Management Testing

### Test 2.1: View Agents List
**Objective**: Verify agents list displays correctly

**Steps**:
1. Complete Test 1.1 (login successfully)
2. Click "Agents" in sidebar navigation
3. Verify page loads at `/agents`
4. Examine agents table

**Expected Results**:
- ✅ Page loads without errors
- ✅ Table shows 3 pre-seeded agents
- ✅ Columns display: Name, Description, Status, Last Run
- ✅ Agent names are clickable links
- ✅ Status badges show correct colors (DRAFT/ACTIVE)
- ✅ "Create Agent" button is visible and functional

**Pass Criteria**: Agents list displays all expected data correctly

---

### Test 2.2: Create New Agent with Recording
**Objective**: Verify agent creation workflow with screen recording

**Steps**:
1. From agents list, click "Create Agent" button
2. Navigate to `/agents/create`
3. Fill in form fields:
   - **Agent Name**: "Test Automation Agent"
   - **Purpose Prompt**: "Automate form filling and data submission on test websites"
4. Click "Start Recording" button
5. Grant screen sharing permissions when prompted
6. Perform a simple workflow (e.g., navigate to a website, fill a form)
7. Click "Stop Recording"
8. Verify recording is captured
9. Click "Save Agent"

**Expected Results**:
- ✅ Form loads correctly with all fields
- ✅ Screen recording starts successfully
- ✅ Recording captures screen activity
- ✅ Recording stops and shows file size
- ✅ Agent saves successfully
- ✅ Redirected to agents list
- ✅ New agent appears in list with DRAFT status

**Pass Criteria**: Complete agent creation workflow succeeds

---

### Test 2.3: View Agent Details
**Objective**: Verify agent detail page displays all information

**Steps**:
1. From agents list, click on any agent name
2. Navigate to agent detail page (`/agents/[id]`)
3. Examine all sections of the page

**Expected Results**:
- ✅ Page loads without errors
- ✅ Agent name and status displayed in header
- ✅ Purpose prompt section shows agent description
- ✅ Recording section shows video player (if recording exists)
- ✅ Run History section displays table
- ✅ Agent Details section shows metadata
- ✅ Workflow Configuration section shows step counts
- ✅ "Run Agent" button is visible

**Pass Criteria**: All agent information displays correctly

---

### Test 2.4: Agent Recording Playback
**Objective**: Verify agent recording can be played back

**Steps**:
1. Complete Test 2.3 (view agent details)
2. Locate the Recording section
3. Click play button on video player
4. Verify video playback

**Expected Results**:
- ✅ Video player loads correctly
- ✅ Play button is functional
- ✅ Video plays the recorded workflow
- ✅ Controls (play/pause/volume) work properly
- ✅ If no recording, shows appropriate "No recording available" message

**Pass Criteria**: Recording playback functions correctly

---

### Test 2.5: Run Agent
**Objective**: Verify agent execution functionality

**Steps**:
1. Complete Test 2.3 (view agent details)
2. Click "Run Agent" button
3. Observe run history table updates
4. Wait for run to complete (or fail)

**Expected Results**:
- ✅ "Run Agent" button becomes disabled during execution
- ✅ New run appears in history table with PENDING status
- ✅ Status updates to RUNNING, then COMPLETED/FAILED
- ✅ Timestamp shows when run started
- ✅ Screenshot column shows image (if available)
- ✅ Logs column shows "View Logs" button (if available)

**Pass Criteria**: Agent execution workflow functions correctly

---

### Test 2.6: Confirm Agent Run
**Objective**: Verify run confirmation functionality

**Steps**:
1. Complete Test 2.5 (run agent)
2. If run shows "REQUIRES_CONFIRMATION" status:
   - Click "Confirm" button
   - Verify status updates
3. If run shows "REQUIRES_CONFIRMATION" status:
   - Click "Reject" button
   - Enter feedback: "Test rejection feedback"
   - Click "Reject Run"

**Expected Results**:
- ✅ Confirm button updates status to CONFIRMED
- ✅ Reject button opens modal with feedback field
- ✅ Feedback is required to reject
- ✅ Rejected runs show feedback in Actions column
- ✅ Status updates reflect confirmation/rejection

**Pass Criteria**: Run confirmation workflow functions correctly

---

## 3. Logins Management Testing

### Test 3.1: View Logins List
**Objective**: Verify logins list displays correctly

**Steps**:
1. Complete Test 1.1 (login successfully)
2. Click "Logins" in sidebar navigation
3. Navigate to `/logins`
4. Examine logins table

**Expected Results**:
- ✅ Page loads without errors
- ✅ Table shows 3 pre-seeded logins
- ✅ Columns display: Name, Login URL, Status, Actions
- ✅ Status badges show appropriate colors and icons
- ✅ URLs are clickable links
- ✅ "Add Login" button is visible and functional

**Pass Criteria**: Logins list displays all expected data correctly

---

### Test 3.2: Add New Login
**Objective**: Verify login creation functionality

**Steps**:
1. From logins list, click "Add Login" button
2. Modal opens with form fields
3. Fill in form:
   - **Name**: "Test System Login"
   - **Login URL**: "https://example.com/login"
   - **Username**: "testuser@example.com"
   - **Password**: "testpassword123"
4. Click "Create Login"
5. Verify modal closes and table updates

**Expected Results**:
- ✅ Modal opens correctly with all form fields
- ✅ All fields are required (validation works)
- ✅ Form submits successfully
- ✅ Modal closes after successful creation
- ✅ New login appears in table
- ✅ Status shows appropriate badge (likely UNKNOWN initially)

**Pass Criteria**: Login creation workflow succeeds

---

### Test 3.3: Delete Login
**Objective**: Verify login deletion functionality

**Steps**:
1. Complete Test 3.2 (add new login)
2. Find the newly created login in the table
3. Click "Delete" button
4. Confirm deletion in browser dialog
5. Verify login is removed from table

**Expected Results**:
- ✅ Delete button is visible for each login
- ✅ Confirmation dialog appears
- ✅ Login is removed from table after confirmation
- ✅ Table updates immediately
- ✅ No error messages displayed

**Pass Criteria**: Login deletion works correctly

---

### Test 3.4: Login Status Verification
**Objective**: Verify login status badges display correctly

**Steps**:
1. Navigate to logins page
2. Examine status badges for all logins
3. Verify badge colors and icons match status

**Expected Results**:
- ✅ Status badges show appropriate colors:
  - ACTIVE: Green with checkmark
  - UNKNOWN: Gray with question mark
  - BROKEN: Red with X
  - Other statuses: Appropriate colors and icons
- ✅ Badge text matches actual status
- ✅ Icons are clearly visible

**Pass Criteria**: Status badges display correctly

---

## 4. Dashboard Testing

### Test 4.1: Dashboard Overview
**Objective**: Verify dashboard displays correct statistics

**Steps**:
1. Complete Test 1.1 (login successfully)
2. Navigate to dashboard (`/`)
3. Examine statistics cards
4. Check recent activity table

**Expected Results**:
- ✅ Page loads without errors
- ✅ Three statistics cards display:
  - Total Agents (should show 3+ after creating agent)
  - Total Logins (should show 3+ after creating login)
  - Recent Runs (should show count of agent runs)
- ✅ Numbers are accurate and update in real-time
- ✅ Quick action buttons are visible and functional

**Pass Criteria**: Dashboard statistics are accurate

---

### Test 4.2: Recent Activity Table
**Objective**: Verify recent activity displays latest runs

**Steps**:
1. Complete Test 2.5 (run agent) to generate activity
2. Navigate to dashboard
3. Examine recent activity table
4. Click on agent name links

**Expected Results**:
- ✅ Recent activity table shows latest 5 runs
- ✅ Columns display: Timestamp, Agent, Status
- ✅ Timestamps show relative time (e.g., "2m ago")
- ✅ Agent names are clickable links
- ✅ Status badges match run statuses
- ✅ Links navigate to correct agent detail pages

**Pass Criteria**: Recent activity displays correctly

---

### Test 4.3: Quick Action Buttons
**Objective**: Verify quick action buttons navigate correctly

**Steps**:
1. Navigate to dashboard
2. Click "Create Agent" quick action button
3. Navigate back to dashboard
4. Click "Add Login" quick action button

**Expected Results**:
- ✅ "Create Agent" button navigates to `/agents/create`
- ✅ "Add Login" button navigates to `/logins`
- ✅ Navigation works correctly
- ✅ Buttons have appropriate styling and hover effects

**Pass Criteria**: Quick actions function correctly

---

## 5. Error Handling Testing

### Test 5.1: Unauthorized Access
**Objective**: Verify proper handling of unauthorized access

**Steps**:
1. Complete Test 1.3 (logout successfully)
2. Try to access `/agents` directly in browser
3. Try to access `/logins` directly in browser
4. Try to access `/agents/create` directly

**Expected Results**:
- ✅ All protected routes redirect to login page
- ✅ No 404 errors or broken pages
- ✅ User cannot access protected content without authentication
- ✅ Redirect happens automatically

**Pass Criteria**: Unauthorized access is properly blocked

---

### Test 5.2: Network Error Handling
**Objective**: Verify application handles network errors gracefully

**Steps**:
1. Complete Test 1.1 (login successfully)
2. Open browser developer tools (F12)
3. Go to Network tab
4. Set network to "Offline" or block requests
5. Try to refresh the page or navigate between pages
6. Restore network connection
7. Click "Retry" buttons if they appear

**Expected Results**:
- ✅ Error banners appear when network is unavailable
- ✅ "Retry" buttons are functional
- ✅ Application doesn't crash or show blank pages
- ✅ Data refreshes when network is restored
- ✅ User can continue using the application

**Pass Criteria**: Network errors are handled gracefully

---

### Test 5.3: Invalid File Upload
**Objective**: Verify error handling for invalid file uploads

**Steps**:
1. Navigate to `/agents/create`
2. Try to upload an invalid file type (e.g., .txt file) for recording
3. Try to upload a very large file
4. Observe error messages

**Expected Results**:
- ✅ Appropriate error messages display for invalid files
- ✅ File upload is rejected gracefully
- ✅ User can retry with correct file type
- ✅ No application crashes or broken states

**Pass Criteria**: File upload errors are handled properly

---

## 6. Cross-Platform Testing

### Test 6.1: Mobile Responsiveness
**Objective**: Verify application works on mobile devices

**Steps**:
1. Open browser developer tools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (e.g., iPhone 12)
4. Navigate through all main pages
5. Test key functionality (login, view agents, view logins)

**Expected Results**:
- ✅ Sidebar adapts to mobile layout
- ✅ Tables are scrollable horizontally if needed
- ✅ Buttons and forms are touch-friendly
- ✅ Text is readable without zooming
- ✅ Navigation works correctly

**Pass Criteria**: Application is functional on mobile devices

---

### Test 6.2: Tablet Responsiveness
**Objective**: Verify application works on tablet devices

**Steps**:
1. Open browser developer tools (F12)
2. Toggle device toolbar
3. Select tablet device (e.g., iPad)
4. Navigate through all main pages
5. Test key functionality

**Expected Results**:
- ✅ Layout adapts appropriately for tablet size
- ✅ Sidebar and main content are properly sized
- ✅ Tables display correctly
- ✅ Touch interactions work properly

**Pass Criteria**: Application is functional on tablet devices

---

### Test 6.3: Desktop Responsiveness
**Objective**: Verify application works on various desktop screen sizes

**Steps**:
1. Resize browser window to different widths:
   - 1920px (large desktop)
   - 1366px (standard laptop)
   - 1024px (small laptop)
2. Navigate through all pages at each size
3. Verify layout and functionality

**Expected Results**:
- ✅ Layout adapts to different screen sizes
- ✅ Sidebar remains functional
- ✅ Tables and content are properly sized
- ✅ No horizontal scrolling issues
- ✅ All functionality remains accessible

**Pass Criteria**: Application works well across desktop screen sizes

---

## 7. Navigation Testing

### Test 7.1: Sidebar Navigation
**Objective**: Verify sidebar navigation works correctly

**Steps**:
1. Complete Test 1.1 (login successfully)
2. Click each navigation item in sidebar:
   - Dashboard
   - Agents
   - Logins
   - Tasks
3. Verify active state highlighting
4. Test hover effects

**Expected Results**:
- ✅ All navigation links work correctly
- ✅ Active page is highlighted in sidebar
- ✅ Hover effects work properly
- ✅ Navigation is smooth and responsive
- ✅ User information displays correctly in sidebar

**Pass Criteria**: Sidebar navigation functions correctly

---

### Test 7.2: Breadcrumb Navigation
**Objective**: Verify breadcrumb and back navigation works

**Steps**:
1. Navigate to agents list
2. Click on an agent name to view details
3. Click "Back to Agents" link
4. Navigate to create agent page
5. Click "Back to Agents" link

**Expected Results**:
- ✅ "Back to Agents" links work correctly
- ✅ Navigation returns to previous page
- ✅ Browser back button also works
- ✅ No broken navigation states

**Pass Criteria**: Back navigation functions correctly

---

## 📊 Test Results Summary

### Test Execution Checklist

**Authentication Tests**:
- [ ] Test 1.1: User Login
- [ ] Test 1.2: Session Persistence  
- [ ] Test 1.3: User Logout
- [ ] Test 1.4: Re-login After Logout

**Agents Management Tests**:
- [ ] Test 2.1: View Agents List
- [ ] Test 2.2: Create New Agent with Recording
- [ ] Test 2.3: View Agent Details
- [ ] Test 2.4: Agent Recording Playback
- [ ] Test 2.5: Run Agent
- [ ] Test 2.6: Confirm Agent Run

**Logins Management Tests**:
- [ ] Test 3.1: View Logins List
- [ ] Test 3.2: Add New Login
- [ ] Test 3.3: Delete Login
- [ ] Test 3.4: Login Status Verification

**Dashboard Tests**:
- [ ] Test 4.1: Dashboard Overview
- [ ] Test 4.2: Recent Activity Table
- [ ] Test 4.3: Quick Action Buttons

**Error Handling Tests**:
- [ ] Test 5.1: Unauthorized Access
- [ ] Test 5.2: Network Error Handling
- [ ] Test 5.3: Invalid File Upload

**Cross-Platform Tests**:
- [ ] Test 6.1: Mobile Responsiveness
- [ ] Test 6.2: Tablet Responsiveness
- [ ] Test 6.3: Desktop Responsiveness

**Navigation Tests**:
- [ ] Test 7.1: Sidebar Navigation
- [ ] Test 7.2: Breadcrumb Navigation

---

## 🐛 Bug Reporting Template

For any issues found during testing, please use this template:

**Bug ID**: [Unique identifier]  
**Test Case**: [Which test case failed]  
**Severity**: [Critical/High/Medium/Low]  
**Browser**: [Chrome/Firefox/Safari/Edge]  
**Device**: [Desktop/Mobile/Tablet]  
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]  
**Actual Result**: [What actually happened]  
**Screenshots**: [Attach if applicable]  
**Additional Notes**: [Any other relevant information]

---

## ✅ Sign-off Criteria

**Ready for Production** when:
- [ ] All Critical and High severity tests pass
- [ ] At least 90% of all test cases pass
- [ ] No data loss or security vulnerabilities found
- [ ] Cross-platform compatibility verified
- [ ] Performance is acceptable on target devices
- [ ] Stakeholder approval obtained

**Tested By**: _________________  
**Date**: _________________  
**Approved By**: _________________  
**Date**: _________________

---

*This QA/UAT script covers the complete functionality of the vergo AI Agents Platform frontend against the locked backend. All tests are designed to be executed by human testers with clear pass/fail criteria.*
