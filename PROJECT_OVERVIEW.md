# vergo - AI Agent Automation Platform

## 🎉 **MAJOR MILESTONE ACHIEVED: Login Agents Working End-to-End!**

**We've successfully built and tested the complete login agent workflow!** This represents a major breakthrough in the platform's capabilities.

## Overview

vergo is a modern AI agent automation platform that enables users to create intelligent agents by recording workflows, with LLM-powered intent generation and self-healing selector repair. The platform provides a secure, user-friendly interface for managing both agents and the credentials they need to operate, featuring rich DOM metadata capture and robust automation capabilities.

### ✅ **Working Login Agent Workflow**
- **Screen Recording**: Users record their login process for AI analysis
- **AI Analysis**: LLM analyzes recordings to create automation scripts
- **Automated Testing**: Real browser automation tests login credentials
- **Credential Management**: Secure editing and updating of login credentials
- **Status Tracking**: Comprehensive status management throughout the workflow

## Key Features

### 🤖 AI Agent Creation & Management
- Create agents by recording browser workflows with rich DOM metadata capture
- Multi-signal event capture with URLs, keystrokes, element types, and screenshots
- LLM-powered automatic intent generation with visual context for each workflow step
- Self-healing execution with primary automation and LLM fallback repair
- Background processing with real-time status tracking
- Execution history with repair logs and performance metrics

### 🧠 Enhanced Automation Capabilities
- Multi-signal event capture (URLs, keystrokes, element types, text content, screenshots)
- Visual context storage with screenshot capture at key workflow moments
- DOM metadata capture (tag, type, innerText, ariaLabel, placeholder)
- Intent-driven selector repair when automation fails
- Two-stage execution with intelligent fallback mechanisms
- Rich contextual information for robust automation
- Scalable event storage with efficient querying

### 🔐 Secure Credential Management ✨ **WORKING END-TO-END**
- **Screen Recording Integration**: Users record login processes for AI analysis
- **Automated Login Testing**: Real browser automation tests login credentials
- **Credential Editing**: Secure updating of login credentials when they change
- **Status Management**: Comprehensive status tracking (NEEDS_TESTING, BROKEN, READY_FOR_AGENTS)
- AES-256 encrypted storage of login credentials and authentication tokens
- URL-based login specification for agent workflows
- Connection testing with real-time status updates
- Secure credential association with agents
- End-to-end encryption for sensitive data

### 🎨 Modern User Interface
- Clean, responsive design built with Next.js and inline CSS
- Intuitive navigation with sidebar-based layout
- Custom modal components for forms and interactions
- Real-time status updates for processing and execution

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Inline CSS (no external UI libraries for MVP)
- **Database**: SQLite with Prisma ORM (PostgreSQL for production)
- **Authentication**: NextAuth.js with JWT strategy
- **Automation**: Puppeteer for browser automation
- **Queue System**: Background job processing for agent execution
- **LLM Integration**: OpenAI API for intent generation and selector repair
- **Security**: bcryptjs for password hashing, crypto-js for encryption
- **Icons**: Lucide React

## Architecture

### Database Schema
- **Users**: User accounts with authentication and session management
- **Agents**: Agent configurations with enriched metadata and processing status
  - `agent_config`: JSONB with structured actions and DOM metadata
  - `purpose_prompt`: User's natural language description
  - `agent_intents`: JSONB with LLM-generated intent annotations
  - `event_log`: JSONB with structured event timeline (legacy)
  - `logicSpec`: Compiled workflow logic specification
  - `processing_status`: Background processing state (processing|ready|failed)
- **Events**: Scalable event storage for multi-signal capture
  - `step`, `action`, `target`, `value`, `url`, `element_type`, `element_text`
  - `screenshot_url`: Reference to stored screenshot files
  - Indexed by `agent_id` and `step` for efficient querying
- **Logins**: Encrypted credential storage with connection testing
- **AgentRuns**: Execution history with repair logs and performance metrics
- **AgentLogins**: Many-to-many relationship between agents and credentials
- **AgentRecordings**: File storage for workflow recordings

### API Design
- RESTful API endpoints for all operations
- Secure authentication and authorization
- Recording upload and processing endpoints
- Agent execution with fallback repair
- Background job processing

### Security Features
- All sensitive data encrypted at rest and in transit
- Secure user authentication with NextAuth.js
- AES-256 encryption for credentials
- Secure file storage and processing
- Credential masking and secure storage

## Getting Started

1. **Installation**: Clone the repository and run `npm install`
2. **Database Setup**: Run `npx prisma migrate dev` and `npx prisma generate`
3. **Environment**: Configure `.env.local` with required environment variables
4. **Development**: Start with `npm run dev` and visit `http://localhost:3000`

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── agents/            # Agent management pages
│   ├── logins/            # Login credential management
│   ├── api/               # API routes
│   └── components/        # Shared components
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
└── prisma/               # Database schema and migrations
```

## Development Status

### ✅ Completed (MVP)
- AI agent creation with workflow recording and DOM metadata capture
- Multi-signal event capture with URLs, keystrokes, element types, and screenshots
- LLM-powered intent generation with visual context and self-healing execution
- Enhanced event storage with scalable Event table and screenshot management
- Secure login credential management with encryption
- Two-stage execution with fallback repair capabilities
- Background processing and queue management
- Modern UI with inline CSS styling
- Secure authentication and authorization
- Database schema and migrations with enriched metadata
- API endpoints for all operations including recording and processing

### 🚧 Future Enhancements
- Advanced LLM models for better intent understanding
- Multi-modal recording (video + audio + text)
- Agent templates and pre-built configurations
- Advanced scheduling and automation
- Enhanced monitoring and analytics dashboard
- Team collaboration and agent sharing
- Integration with external services and APIs
- Advanced security and compliance features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
