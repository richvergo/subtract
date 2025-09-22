# 🔒 LOGINS FEATURE - CRITICAL STABILITY DOCUMENTATION

## ⚠️ CRITICAL WARNING
**THIS FEATURE IS PRODUCTION-READY AND MUST NOT BE BROKEN BY FUTURE CHANGES**

The logins feature has been tested and verified working with:
- ✅ Vergo login (https://apply.getvergo.com)
- ✅ Google Slides login (https://slides.google.com)
- ✅ Database seeding and restoration
- ✅ All CRUD operations (Create, Read, Update, Delete)
- ✅ Interactive testing with automated browser automation

## 🏗️ ARCHITECTURE OVERVIEW

### Core Components
```
src/app/logins/page.tsx          # Main logins management UI
src/app/api/logins/              # API endpoints for login operations
├── route.ts                     # GET/POST for listing and creating logins
├── [id]/route.ts               # PUT/DELETE for updating/deleting specific logins
├── [id]/check/route.ts         # POST for checking login status
├── [id]/test-interactive/route.ts # POST for automated login testing
└── [id]/credentials/route.ts   # GET for retrieving login credentials
```

### Database Schema
```sql
-- Login table structure (from prisma/schema.prisma)
model Login {
  id            String   @id @default(cuid())
  name          String
  loginUrl      String
  username      String
  password      String?  @default("")
  oauthToken    String?  @default("")
  status        LoginStatus
  lastCheckedAt DateTime?
  lastSuccessAt DateTime?
  lastFailureAt DateTime?
  failureCount  Int      @default(0)
  errorMessage  String?  @default("")
  ownerId       String
  owner         User     @relation(fields: [ownerId], references: [id])
  agents        Agent[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("logins")
}

enum LoginStatus {
  UNKNOWN
  ACTIVE
  NEEDS_RECONNECT
  DISCONNECTED
  BROKEN
  EXPIRED
  SUSPENDED
  READY_FOR_AGENTS
  NEEDS_TESTING
}
```

## 🎯 FEATURE CAPABILITIES

### 1. Login Management
- **Create**: Add new logins with credentials
- **Read**: View all logins with status indicators
- **Update**: Modify credentials (username/password)
- **Delete**: Remove logins with confirmation

### 2. Status Management
- Real-time status tracking with visual indicators
- Automatic status updates based on test results
- Error message storage and display

### 3. Interactive Testing
- Automated browser testing using Puppeteer
- Support for traditional forms and OAuth flows
- Google multi-step login handling
- SSO form detection and handling

### 4. Security Features
- Credential encryption and secure storage
- Session-based authentication required
- CSRF protection via credentials: 'include'
- Secure credential retrieval (password field empty by default)

## 🔧 TECHNICAL IMPLEMENTATION

### State Management (src/app/logins/page.tsx)
```typescript
// CRITICAL: These state variables MUST be maintained
const [isModalOpen, setIsModalOpen] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [isTesting, setIsTesting] = useState(false);
const [testResult, setTestResult] = useState<TestResult | null>(null);
const [modalError, setModalError] = useState<string | null>(null);
const [wizardStep, setWizardStep] = useState(1);
const [createdLoginId, setCreatedLoginId] = useState<string | null>(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editingLogin, setEditingLogin] = useState<LoginData | null>(null);
const [editFormData, setEditFormData] = useState({ username: '', password: '' });
const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
const [hasRecording, setHasRecording] = useState(false);           // CRITICAL
const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null); // CRITICAL
const [recordingError, setRecordingError] = useState<string | null>(null); // CRITICAL
const [isRecording, setIsRecording] = useState(false);             // CRITICAL
const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle'); // CRITICAL
```

### API Endpoints
```typescript
// GET /api/logins - List all logins for authenticated user
// POST /api/logins - Create new login
// PUT /api/logins/[id] - Update login credentials
// DELETE /api/logins/[id] - Delete login
// POST /api/logins/[id]/check - Check login status
// POST /api/logins/[id]/test-interactive - Run automated login test
// GET /api/logins/[id]/credentials - Get login credentials
```

### Form Validation
```typescript
// Required fields validation
if (!formData.name.trim() || !formData.loginUrl.trim() || 
    !formData.username.trim() || !formData.password.trim()) {
  setModalError('All fields are required');
  return;
}
```

## 🧪 TESTING VERIFICATION

### Manual Testing Checklist
- [ ] Create new login with valid credentials
- [ ] Test login with automated browser
- [ ] Edit existing login credentials
- [ ] Delete login with confirmation
- [ ] View login status indicators
- [ ] Handle OAuth flows (Google, Microsoft, etc.)
- [ ] Handle traditional username/password forms

### Automated Testing
```bash
# Run login-specific tests
npm run test:api

# Run end-to-end tests
npm run test:e2e

# Run all tests
npm run test:all
```

## 🚨 BREAKING CHANGE PROTECTION

### What MUST NOT Change
1. **State Variables**: All useState declarations in logins page
2. **API Endpoints**: URL structure and response formats
3. **Database Schema**: Login table structure and relationships
4. **Authentication**: Session-based auth requirement
5. **Form Validation**: Required field validation logic
6. **Status Enum**: LoginStatus enum values

### What CAN Change (Safely)
1. **UI Styling**: CSS styles and visual appearance
2. **Error Messages**: Text content of error messages
3. **Loading States**: Visual loading indicators
4. **Additional Features**: New functionality that doesn't break existing

### Pre-Change Checklist
Before making ANY changes to login-related code:
- [ ] Run existing tests: `npm run test:api`
- [ ] Test manual login creation
- [ ] Test login editing functionality
- [ ] Test login deletion
- [ ] Test automated login testing
- [ ] Verify database operations work
- [ ] Check that all state variables are still defined

## 🔄 DEPLOYMENT SAFEGUARDS

### Pre-Deployment Checklist
- [ ] All login tests pass
- [ ] Database migrations are safe (no breaking schema changes)
- [ ] API endpoints maintain backward compatibility
- [ ] State management is intact
- [ ] Authentication flow works
- [ ] Manual testing of core login operations

### Rollback Plan
If login functionality breaks after deployment:
1. Immediately rollback to previous commit (870dd6e or later)
2. Verify database is in working state
3. Re-run database seeding if needed: `npx prisma db seed`
4. Test login functionality manually
5. Investigate and fix issues in development environment

## 📋 MAINTENANCE GUIDELINES

### Regular Maintenance
- Monitor login test success rates
- Update browser automation dependencies carefully
- Review and update security practices
- Monitor for new login form patterns

### Troubleshooting Common Issues
1. **State Variable Errors**: Ensure all useState declarations are present
2. **API Errors**: Check endpoint URLs and response formats
3. **Database Issues**: Verify schema matches expected structure
4. **Authentication Issues**: Ensure session management is working
5. **Browser Automation Failures**: Check Puppeteer configuration and target site changes

## 🎯 SUCCESS CRITERIA

The logins feature is considered stable when:
- ✅ All CRUD operations work without errors
- ✅ Automated testing successfully logs into supported sites
- ✅ Status indicators accurately reflect login state
- ✅ No runtime errors in browser console
- ✅ All existing tests pass
- ✅ Manual testing confirms all functionality works

## 📞 SUPPORT CONTACTS

For issues with the logins feature:
1. Check this documentation first
2. Review the commit history for recent changes
3. Run the test suite to identify specific failures
4. Check browser console for runtime errors
5. Verify database state and schema integrity

---

**Last Updated**: $(date)
**Commit Hash**: 870dd6e
**Status**: ✅ PRODUCTION READY - DO NOT BREAK
