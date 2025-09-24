# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] – 2025-09-22

### 🎉 MAJOR MILESTONE: Login Agents Working End-to-End

This release represents a major breakthrough - login agents now work completely from creation to successful automation!

### Added

- **Complete Login Agent Workflow**: Users can now create, record, analyze, and test login agents successfully
- **Screen Recording Integration**: Users record their login process which is analyzed to create automation scripts
- **Automated Login Testing**: Puppeteer-based browser automation that actually tests login credentials
- **Credential Management**: Secure editing and updating of login credentials
- **Status Management**: Comprehensive status tracking (NEEDS_TESTING, BROKEN, READY_FOR_AGENTS, etc.)

### New Features

#### Login Creation & Management
- **3-Step Wizard**: Credentials → Recording → Save workflow
- **Screen Recording**: Users record their login process for analysis
- **Credential Encryption**: All passwords and sensitive data encrypted at rest
- **Status Tracking**: Clear status indicators for each login (Needs Testing, Ready for Agents, etc.)

#### Automated Testing
- **Puppeteer Integration**: Real browser automation for login testing
- **Smart Form Detection**: Automatically finds username, password, and submit fields
- **Success Detection**: Multiple methods to verify successful login
- **Error Handling**: Graceful handling of bad credentials and login failures

#### User Experience
- **Edit Credentials**: Users can update login credentials when they change
- **Error Recovery**: Clear error messages and recovery paths
- **Loading States**: Proper feedback during async operations
- **Security**: Password fields always empty for security reasons

### New API Endpoints

- `POST /api/logins` – Create login with recording support
- `GET /api/logins` – List user logins with masked credentials
- `PUT /api/logins/[id]` – Update login credentials
- `DELETE /api/logins/[id]` – Delete login
- `GET /api/logins/[id]/status` – Get login status and analysis results
- `POST /api/logins/[id]/test-interactive` – Test login with browser automation
- `GET /api/logins/[id]/credentials` – Get unmasked username for editing
- `POST /api/logins/[id]/check` – Check if login needs reconnection

### Database Schema Changes

- Added `NEEDS_TESTING` status to `LoginStatus` enum
- Added `recordingUrl` field for screen recordings
- Added `analysisStatus` and `analysisResult` fields
- Enhanced error tracking with `errorMessage` and `failureCount`

### Security Enhancements

- **Credential Encryption**: All passwords encrypted using AES-256
- **Masked Responses**: API responses mask sensitive credentials
- **Secure Editing**: Password fields never pre-populated
- **Authentication**: All endpoints require valid session

### Technical Improvements

- **Error Handling**: Comprehensive error handling throughout the workflow
- **Status Management**: Smart status transitions based on test results
- **Browser Automation**: Robust Puppeteer integration with proper cleanup
- **File Management**: Secure handling of uploaded recordings

### Breaking Changes

- Login creation now requires screen recording
- Status workflow changed (NEEDS_TESTING instead of immediate READY_FOR_AGENTS)
- Removed reconnect feature (replaced with edit credentials)

### Migration Notes

- Existing logins will need to be re-tested to update their status
- Users should record new login processes for optimal automation
- Old reconnect functionality has been replaced with edit credentials

---

## [0.2.0] – 2025-09-15

### Added

- Enriched Event Logs System with multi-signal capture (URLs, keystrokes, element types, screenshots).
- Visual Context Storage: secure screenshot handling with validation and sanitization.
- Enhanced LLM Integration: enterprise logic compilation with visual context.

### New API Endpoints

- `POST /api/agents/record` – enterprise-grade workflow capture
- `GET /api/agents/[id]/review` – enriched with events array + screenshots
- `POST /api/agents/[id]/generate-logic` – enterprise logic compilation

### Security

- Full authentication & authorization on new endpoints.
- Sensitive values excluded (passwords, secure URLs).
- File validation: 200KB max, PNG/JPEG only.
- Filename sanitization to prevent path traversal.

### Database

- New Event model with relations and indexes.
- Cascade deletion on agent removal.
- Migration applied successfully without data loss.

### Documentation & Testing

- Updated API contracts and schema definitions.
- Security guidelines extended for event logs.
- Comprehensive test plans executed and validated.

### Status

- ✅ Fully implemented
- ✅ Thoroughly tested
- ✅ Well documented
- ✅ Secure
- ✅ Backward compatible
- ✅ Frontend ready

## [0.1.0] – 2025-09-14

### Added

- Initial AI agent automation platform
- Agent creation with workflow recording and DOM metadata capture
- LLM-powered intent generation and self-healing execution
- Secure login credential management with encryption
- Two-stage execution with fallback repair capabilities
- Background processing and queue management
- Modern UI with inline CSS styling
- Secure authentication and authorization
