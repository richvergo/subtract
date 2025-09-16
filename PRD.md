# Product Requirements Document (PRD) - vergo

## Problem & User
- **User:** Business professionals, developers, and automation enthusiasts
- **Problem:** Repetitive tasks and workflows require manual intervention, leading to inefficiency, errors, and time waste. Users need a platform to create, manage, and deploy AI agents that can automate these processes with intelligent self-healing capabilities.

---

## Product Vision

vergo is an AI agent automation platform that enables users to create intelligent agents by recording workflows, with LLM-powered intent generation and self-healing selector repair. The platform provides a secure, user-friendly interface for managing both agents and the credentials they need to operate, featuring rich DOM metadata capture and robust automation capabilities.

---

## Core Features

### AI Agent Management
- **Workflow Recording**: Create agents by recording browser workflows with rich DOM metadata capture
- **Multi-Signal Capture**: Enhanced event logs with URLs, keystrokes, element types, and screenshots
- **LLM-Powered Intelligence**: Automatic intent generation for each workflow step with visual context
- **Self-Healing Execution**: Two-stage execution with primary automation and LLM fallback repair
- **Rich Metadata Storage**: Store DOM elements, timestamps, contextual information, and visual snapshots
- **Agent Configuration**: JSON-based configuration with structured actions and intent annotations
- **Execution History**: Track runs with repair logs and performance metrics

### Enhanced Automation Capabilities
- **Multi-Signal Event Capture**: URLs, keystrokes, element types, text content, and screenshots
- **Visual Context Storage**: Screenshot capture at key workflow moments for better LLM understanding
- **DOM Metadata Capture**: Extract tag, type, innerText, ariaLabel, placeholder for each action
- **Intent-Driven Repair**: When selectors fail, use LLM to generate new selectors based on intent
- **Background Processing**: Queue-based recording processing and intent generation
- **Processing Status Tracking**: Real-time progress updates during agent creation
- **Scalable Event Storage**: Event table for large datasets with efficient querying

### Login Credential Management
- **Secure Storage**: AES-256 encrypted storage of login credentials and authentication tokens
- **URL-Based Login**: Direct URL specification for agent login workflows
- **Credential Association**: Link multiple login credentials to agents
- **Connection Testing**: Test login connections with real-time status updates
- **Security**: End-to-end encryption for sensitive credential data

### User Experience (MVP)

#### First Login
1. User registers and logs in
2. User sees a clean landing page with options to create agents or manage logins
3. User can start by adding login credentials or creating their first agent

#### AI Agent Creation Workflow
1. **Record Workflow**: User records a browser workflow with screen recording and enriched event capture
2. **Multi-Signal Capture**: System captures URLs, keystrokes, element interactions, and screenshots
3. **Upload & Process**: System processes recording, extracts DOM metadata, and stores visual context
4. **Define Purpose**: User provides a natural language description of the agent's purpose
5. **Generate Intents**: LLM analyzes the workflow with visual context and generates intent annotations
6. **Review & Confirm**: User reviews structured steps, intent descriptions, and visual snapshots
7. **Test & Activate**: User tests the agent and activates it for production use

#### Agent Execution Workflow
1. **Primary Execution**: Agent runs using stored selectors and metadata
2. **Fallback Repair**: If selectors fail, LLM generates new selectors based on intent
3. **Monitor Results**: View execution status, repair logs, and performance metrics
4. **Review Repairs**: See which selectors were repaired and why

#### Login Management
1. **Add Credentials**: Store login URLs, usernames, and passwords securely
2. **Test Connections**: Verify login credentials work with target systems
3. **Associate with Agents**: Link credentials to specific agents
4. **Update Credentials**: Modify stored credentials as needed

---

## Technical Architecture

### Multi-Entity Support
- **Entity Management**: Support for multiple organizations/entities
- **User Roles**: ADMIN, MANAGER, EMPLOYEE roles with appropriate permissions
- **Data Isolation**: Complete data separation between entities

### Security
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Authentication**: Secure user authentication with NextAuth.js
- **Authorization**: Role-based access control for all operations

### Database Schema
- **Users**: User accounts with authentication and session management
- **Agents**: Agent configurations with enriched metadata and processing status
  - `agent_config`: JSONB with structured actions and DOM metadata
  - `purpose_prompt`: User's natural language description
  - `agent_intents`: JSONB with LLM-generated intent annotations
  - `event_log`: JSONB with structured event timeline (legacy)
  - `transcript`: Voice narration transcript from recordings
  - `processing_status`: Background processing state (processing|ready|failed)
- **Events**: Scalable event storage for multi-signal capture
  - `step`, `action`, `target`, `value`, `url`, `element_type`, `element_text`
  - `screenshot_url`: Reference to stored screenshot files
  - Indexed by `agent_id` and `step` for efficient querying
- **Logins**: Encrypted credential storage with connection testing
- **AgentRuns**: Execution history with repair logs and performance metrics
- **AgentLogins**: Many-to-many relationship between agents and credentials
- **AgentRecordings**: File storage for workflow recordings

---

## User Interface

### Navigation
- **Sidebar Navigation**: Clean, modern sidebar with Agents and Logins sections
- **Responsive Design**: Mobile-friendly interface with inline CSS styling
- **Modal System**: Custom modal components for forms and interactions

### Pages
- **Landing Page**: Welcome screen with quick access to core features
- **Agents Page**: List, create, and manage AI automation agents with recording capabilities
- **Agent Detail Page**: View agent configuration, intents, and execution history with repair logs
- **Logins Page**: Manage login credentials with connection testing

### Components
- **Agent Cards**: Display agent information, processing status, and execution capabilities
- **Recording Upload**: File upload interface for workflow recordings
- **Intent Display**: Show LLM-generated intent descriptions alongside structured actions
- **Repair Logs**: Display selector repair attempts and LLM reasoning
- **Login Cards**: Show credential information with connection status and security indicators
- **Status Indicators**: Real-time status updates for processing and execution

---

## API Design

### Agent Management Endpoints
- `GET /api/agents` - List user's agents with enriched metadata
- `POST /api/agents` - Create new agent with purpose prompt
- `GET /api/agents/[id]` - Get agent details with config and intents
- `PUT /api/agents/[id]` - Update agent configuration
- `DELETE /api/agents/[id]` - Delete agent and all runs

### Recording & Processing Endpoints
- `POST /api/agent-recordings` - Upload workflow recording file
- `POST /api/agents/create-from-recording` - Create agent from recording
- `POST /api/internal/agents/[id]/processing-complete` - Internal processing status update

### Agent Execution Endpoints
- `POST /api/agents/[id]/run` - Execute agent with fallback repair
- `GET /api/agents/[id]/runs` - Get execution history with repair logs

### Login Management Endpoints
- `GET /api/logins` - List user's login credentials (masked)
- `POST /api/logins` - Add new login credentials (encrypted)
- `GET /api/logins/[id]` - Get login details (masked)
- `PUT /api/logins/[id]` - Update login credentials (encrypted)
- `DELETE /api/logins/[id]` - Delete login credentials
- `GET /api/logins/[id]/check` - Test login connection

---

## Success Metrics

### User Engagement
- Number of agents created per user
- Frequency of agent executions
- User retention and active usage
- Recording upload and processing success rate

### Platform Performance
- Agent execution success rate (primary + fallback repair)
- Average execution time
- Selector repair success rate
- LLM processing time and accuracy
- System uptime and reliability

### Security
- Zero credential breaches
- Successful authentication rate
- Encryption compliance for sensitive data
- Secure file storage and processing

---

## Future Enhancements

### Advanced Features
- **Agent Templates**: Pre-built agent configurations for common workflows
- **Scheduling**: Automated agent execution on schedules
- **Integration APIs**: Connect with external services and platforms
- **Analytics Dashboard**: Detailed insights into agent performance
- **Team Collaboration**: Share agents and credentials across team members

### Technical Improvements
- **Scalability**: Support for high-volume agent executions
- **Monitoring**: Advanced logging and monitoring capabilities
- **Backup & Recovery**: Automated backup and disaster recovery
- **Multi-Cloud**: Support for multiple cloud providers

---

## Development Roadmap

### Phase 1 (MVP) - Current
- ✅ AI agent creation with workflow recording
- ✅ LLM-powered intent generation and self-healing execution
- ✅ Rich DOM metadata capture and storage
- ✅ Secure login credential management with encryption
- ✅ Two-stage execution with fallback repair
- ✅ Background processing and queue management
- ✅ Modern UI with inline CSS styling

### Phase 2
- Advanced LLM models for better intent understanding
- Multi-modal recording (video + audio + text)
- Agent templates and pre-built configurations
- Enhanced monitoring and analytics dashboard
- Advanced scheduling and automation

### Phase 3
- Team collaboration and agent sharing
- Integration with external services and APIs
- Advanced security and compliance features
- Multi-language support for global users