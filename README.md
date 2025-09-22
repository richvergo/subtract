# vergo - AI Agent Automation Platform

vergo is a modern AI agent automation platform that enables users to create, manage, and deploy intelligent agents for automating repetitive tasks and workflows. The platform provides a secure, user-friendly interface for managing both agents and the credentials they need to operate.

## Features

### 🤖 **Simplified Agent Creation**
- **4-Step Wizard**: Choose login → Record workflow → AI summarizes → Test automation
- **🧠 LLM-Powered Analysis**: AI automatically understands and summarizes recorded workflows
- **✅ Confidence Building**: Clear summaries that show the AI understands your process
- **🧪 Live Testing**: Agents actually run your workflow to prove they work

### 🔐 **Smart Login Management**
- **📹 Screen Recording**: Record login processes for AI analysis
- **🤖 Login Agents**: AI creates automated login workflows from recordings
- **🔒 Secure Storage**: AES-256 encrypted credential storage
- **🔄 Auto-Detection**: AI analyzes recordings to extract login steps and selectors

### ⚡ **Intelligent Automation**
- **🧠 LLM Integration**: OpenAI-powered workflow analysis and selector repair
- **📊 Rich Metadata**: Capture DOM elements, timestamps, and contextual information
- **🔄 Self-Healing**: Automatic selector repair when automation fails
- **🎯 Smart Execution**: Two-stage execution with primary automation and LLM fallback

### 🎨 **Modern User Experience**
- **📱 Responsive Design**: Clean interface built with Next.js 15, React 19
- **🎯 Task-Focused**: Streamlined navigation (Tasks → Agents → Logins)
- **⚡ Real-Time Updates**: SWR-powered data fetching and caching
- **🔐 Secure Authentication**: NextAuth.js with JWT strategy

## 📚 Documentation & Guidelines

**🚀 Start here**: **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Your guide to all documentation

### Essential Reading
- **[DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)** - Comprehensive coding standards and guard rails
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Common fixes and essential commands
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute effectively
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design decisions
- **[TESTING.md](./TESTING.md)** - Testing strategies and best practices
- **[BACKEND_PROTECTION_SUMMARY.md](./BACKEND_PROTECTION_SUMMARY.md)** - Backend lock policy and protection

These documents prevent common errors and ensure code quality consistency.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- SQLite database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vergo-automation-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp infra/env.example .env.local
# Edit .env.local with your configuration
```

4. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

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

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Custom CSS classes in `globals.css` + inline styles (no Tailwind/shadcn for MVP)
- **Data Fetching**: SWR for caching and real-time updates
- **UI Components**: Custom components (Sidebar, Buttons, Cards) with inline styles
- **Routing**: Next.js App Router with file-based routing
- **Database**: SQLite with Prisma ORM (PostgreSQL for production)
- **Authentication**: NextAuth.js with JWT strategy
- **Automation**: Puppeteer for browser automation
- **Queue System**: Redis + BullMQ for background job processing
- **LLM Integration**: OpenAI API for intent generation and selector repair

## API Endpoints

### Agent Management
- `GET /api/agents` - List user's agents with enriched metadata
- `POST /api/agents` - Create new agent with purpose prompt
- `GET /api/agents/[id]` - Get agent details with config and intents
- `PUT /api/agents/[id]` - Update agent configuration
- `DELETE /api/agents/[id]` - Delete agent
- `POST /api/agents/[id]/run` - Execute an agent with fallback repair
- `GET /api/agents/[id]/runs` - Get execution history with repair logs
- `POST /api/agents/[id]/activate` - Activate agent for production use
- `POST /api/agents/[id]/annotate` - Generate LLM annotations for agent
- `POST /api/agents/[id]/repair` - Repair agent with LLM fallback

### 🤖 **New Agent Creation (4-Step Wizard)**
- `POST /api/agents/record` - Create agent with login association and recording
- `POST /api/agents/[id]/summarize-workflow` - Generate AI summary of recorded workflow
- `POST /api/agents/[id]/test-workflow` - Test agent workflow execution

### 🧠 **LLM Integration**
- `POST /api/agents/[id]/summarize-workflow` - AI workflow summarization
- `POST /api/agents/[id]/test-workflow` - Live workflow testing
- `POST /api/logins/[id]/analyze` - AI analysis of login recordings

### Agent Runs
- `POST /api/agent-runs/[id]/confirm` - Confirm successful agent run
- `POST /api/agent-runs/[id]/reject` - Reject failed agent run

### 🔐 **Smart Login Management**
- `GET /api/logins` - List user's login credentials (masked)
- `POST /api/logins` - Add new login with screen recording and AI analysis
- `GET /api/logins/[id]` - Get login details
- `PUT /api/logins/[id]` - Update login credentials
- `DELETE /api/logins/[id]` - Delete login
- `POST /api/logins/[id]/analyze` - **NEW**: AI analysis of login recording
- `POST /api/logins/health` - Test all user's login credentials
- `GET /api/logins/health` - Get health status of all user's logins
- `POST /api/logins/[id]/health` - Test specific login credentials
- `GET /api/logins/[id]/health` - Check specific login health status
- `POST /api/logins/[id]/check` - Check login connection
- `GET /api/logins/[id]/status` - Get login status
- `POST /api/logins/[id]/reconnect/start` - Start login reconnection process
- `POST /api/logins/[id]/reconnect/complete` - Complete login reconnection

### Authentication & Users
- `POST /api/register` - Register new user
- `GET /api/users` - Get user information
- `POST /api/users` - Update user information
- `POST /api/auth/switch-entity` - Switch user entity context

### System
- `GET /api/health` - System health check
- `GET /api/login-templates` - Get available login templates
- `GET /api/test` - Test endpoint

## Development

### Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push
```

### Testing

```bash
# Run all tests
npm test

# Run specific test files
npm test -- tests/test_enhanced_agents_simple.test.ts

# Run tests in watch mode
npm run test:watch
```

### Agent Development

```bash
# Start development server
npm run dev

# Start background worker for agent execution
npm run worker:dev

# Test agent creation from recording
curl -X POST http://localhost:3000/api/agents/record \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Agent", "recordedSteps": [...], "purposePrompt": "..."}'

# Test agent execution
curl -X POST http://localhost:3000/api/agents/{id}/run
```

## Deployment

The application is configured for deployment with Docker containers. See the deployment guide in the `infra/` directory for detailed instructions.

### Production Stack
- **Frontend**: Vercel (Next.js)
- **Backend**: Render (Node.js + Puppeteer)
- **Database**: PostgreSQL (Render managed)
- **Queue**: Redis (Render managed)
- **Storage**: Local volumes for agent outputs

## Architecture Validation Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **API Endpoints** | ✅ **ACCURATE** | All documented endpoints exist and work |
| **Data Flow** | ✅ **ACCURATE** | Redis queue → Worker → Puppeteer confirmed |
| **Database Schema** | ✅ **ACCURATE** | Field names and relationships correct |
| **Security Model** | ✅ **ACCURATE** | Encryption and RBAC implemented |
| **Frontend Styling** | ✅ **FIXED** | Updated to Custom CSS, inline styles |
| **Agent Creation** | ✅ **FIXED** | Single-step process via `/api/agents/record` |
| **Session Management** | ✅ **ACCURATE** | 2FA and reconnect logic confirmed |
| **Testing Strategy** | ✅ **ACCURATE** | Puppeteer + LLM mocked in CI |

## Areas Needing Product Decisions

### Session Reuse / 2FA Design
**Current Implementation:** Agents check session validity before execution. Failed sessions trigger `NEEDS_RECONNECT` status.
**Decision Needed:** Should failed session checks trigger automatic re-authentication or require manual user intervention?

### Agent Creation UX
**Current Implementation:** Single API call creates agent from recording with LLM annotation.
**Decision Needed:** Should this remain single-step or be split into upload → process → create for better UX?

### Testing Strategy
**Current Implementation:** Comprehensive mocking of Puppeteer + LLM in CI.
**Decision Needed:** Should we add integration tests with real browser instances for critical paths?

### Error Handling
**Current Implementation:** Basic error responses and status updates.
**Decision Needed:** Should we implement retry logic for failed agent runs?

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.