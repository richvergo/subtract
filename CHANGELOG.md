# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] – 2025-09-15

### Added

- Enriched Event Logs System with multi-signal capture (URLs, keystrokes, element types, screenshots).
- Visual Context Storage: secure screenshot handling with validation and sanitization.
- Enhanced LLM Integration: summarization with visual context.

### New API Endpoints

- `POST /api/agents/record-events` – multi-signal capture
- `GET /api/agents/[id]/review` – enriched with events array + screenshots
- `POST /api/agents/[id]/summarize` – integrates visual context

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
