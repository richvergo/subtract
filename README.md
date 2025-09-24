# vergo - Enterprise-Grade AI Agent Automation Platform

vergo is a modern, enterprise-grade AI agent automation platform that enables users to create, manage, and deploy intelligent agents for automating complex workflows with advanced Puppeteer integration and secure login management.

## 🚀 **Enterprise-Grade Architecture**

Built on a robust Puppeteer-first stack with enterprise-grade components:

- **🎬 Capture System**: Advanced Puppeteer-based workflow recording
- **🔄 Replay Engine**: Intelligent action replay with fallback mechanisms  
- **🧠 Logic Compiler**: Natural language rule compilation and execution
- **🏃 Agent Runner**: Enterprise-grade execution with retry policies
- **🔐 LoginAgentAdapter**: Secure login integration and session management
- **⏰ Scheduler**: Advanced scheduling and workflow orchestration

## 🏗️ **Core Modules**

### **Capture System**
- **PuppeteerCaptureService**: Records user interactions with DOM metadata
- **Multi-signal capture**: Actions, screenshots, timestamps, and context
- **Selector generation**: Robust element identification strategies
- **Login integration**: Seamless capture of authenticated workflows

### **Replay Engine** 
- **PuppeteerReplayService**: Executes recorded workflows with precision
- **Wait policies**: Intelligent timing and element detection
- **Retry mechanisms**: Automatic failure recovery and selector repair
- **Visual feedback**: Element highlighting during execution

### **Logic Compiler**
- **Natural language processing**: Converts human rules to executable logic
- **Rule engine**: Conditional logic, loops, and variable handling
- **Validation**: Comprehensive logic specification validation
- **Error handling**: Detailed compilation error reporting

### **Agent Runner**
- **Enterprise execution**: Production-ready workflow execution
- **LoginAgentAdapter integration**: Secure authentication handling
- **Monitoring**: Real-time execution tracking and logging
- **Screenshot capture**: Visual debugging and audit trails

### **LoginAgentAdapter**
- **Universal login support**: Handles complex authentication flows
- **Session management**: Secure credential storage and reuse
- **2FA support**: Multi-factor authentication integration
- **Health monitoring**: Proactive login status validation

### **Scheduler**
- **Advanced scheduling**: Cron-based and event-driven execution
- **Queue management**: Background job processing
- **Retry policies**: Configurable failure recovery
- **Monitoring**: Execution metrics and performance tracking

## 📊 **Database Schema**

### **Enterprise Workflow Models**
- **Workflow**: Core workflow definitions with logic specifications
- **WorkflowAction**: Individual workflow steps with metadata
- **WorkflowRun**: Execution instances with detailed logging
- **WorkflowRunStep**: Granular step execution tracking
- **WorkflowVariable**: Dynamic variable definitions and validation
- **WorkflowSchedule**: Advanced scheduling configurations

### **Legacy Agent Models** (Maintained for compatibility)
- **Agent**: Traditional agent definitions
- **Login**: Secure credential storage
- **AgentRun**: Execution history and results
- **Event**: Detailed action logging

## 🚀 **Quickstart Guide**

### **1. Create Workflow**
```bash
# Record a new workflow
curl -X POST http://localhost:3000/api/agents/record \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Onboarding",
    "description": "Automated customer onboarding process",
    "actions": [...],
    "requiresLogin": true,
    "loginConfig": {
      "username": "user@example.com",
      "password": "secure_password",
      "url": "https://app.example.com"
    }
  }'
```

### **2. Compile Logic Rules**
```bash
# Generate logic from natural language
curl -X POST http://localhost:3000/api/agents/{id}/generate-logic \
  -H "Content-Type: application/json" \
  -d '{
    "nlRules": [
      "If customer type is 'enterprise', require manager approval",
      "For each product in cart, validate inventory availability",
      "Send welcome email after successful registration"
    ]
  }'
```

### **3. Execute Workflow**
```bash
# Run workflow with variables
curl -X POST http://localhost:3000/api/agents/{id}/run \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "customerType": "enterprise",
      "products": ["product1", "product2"]
    }
  }'
```

### **4. View Execution History**
```bash
# Get detailed run history
curl -X GET http://localhost:3000/api/agents/{id}/runs
```

## 🧪 **Testing**

### **Unit Tests**
```bash
# Run all unit tests
npm test

# Run specific test suites
npm test -- tests/agents/capture/
npm test -- tests/agents/exec/
npm test -- tests/agents/login/
```

### **Integration Tests**
```bash
# Run comprehensive integration tests
./scripts/run-integration-tests.sh

# Manual integration testing
npm test -- tests/integration/WorkflowIntegration.test.ts
```

### **Test Coverage**
- **Unit Tests**: 95%+ coverage for core modules
- **Integration Tests**: End-to-end workflow validation
- **E2E Tests**: Full browser automation testing
- **Mock Strategy**: Comprehensive Puppeteer and LLM mocking

## 🛠️ **Development Setup**

### **Prerequisites**
- Node.js 18+
- SQLite (development) / PostgreSQL (production)
- Redis (for queue processing)

### **Installation**
```bash
# Clone repository
git clone <repository-url>
cd vergo-automation-platform

# Install dependencies
npm install

# Setup environment
cp infra/env.example .env.local
# Edit .env.local with your configuration

# Setup database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

### **Database Management**
```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

## 📚 **Documentation**

### **Core Documentation**
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design decisions
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Extension and development guidelines
- **[Project-Guidelines.md](./Project-Guidelines.md)** - Coding standards and conventions
- **[API_CONTRACT.md](./API_CONTRACT.md)** - API documentation and schemas

### **Testing Documentation**
- **[tests/integration/README.md](./tests/integration/README.md)** - Integration testing guide
- **[TESTING.md](./TESTING.md)** - Testing strategies and best practices

### **Deployment Documentation**
- **[PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)** - Production deployment guide
- **[infra/README.md](./infra/README.md)** - Infrastructure and deployment

## 🔧 **Technology Stack**

### **Frontend**
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety
- **Custom CSS** - No external frameworks for optimal performance
- **Enterprise UI Components** - WorkflowReplay, LogicEditor, RunConsole, VariableConfigModal, ScheduleEditor
- **Login Integration** - Secure authentication UI with LoginAgentAdapter integration

### **Backend**
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe database ORM
- **NextAuth.js** - Authentication and session management
- **Zod** - Runtime type validation

### **Automation Engine**
- **Puppeteer** - Enterprise-grade browser automation
- **LoginAgentAdapter** - Secure login integration
- **LogicCompiler** - Natural language rule processing
- **AgentRunner** - Production-ready execution engine

### **Infrastructure**
- **SQLite** - Development database
- **PostgreSQL** - Production database
- **Redis** - Queue processing and caching
- **Docker** - Containerized deployment

## 🔐 **Security Features**

### **Authentication & Authorization**
- **JWT-based authentication** via NextAuth.js
- **Route-level protection** for sensitive endpoints
- **Role-based access control** (RBAC)
- **Session management** with secure tokens

### **Data Protection**
- **AES-256 encryption** for stored credentials
- **Environment-based encryption keys**
- **No plaintext storage** of sensitive data
- **Secure session handling**

### **API Security**
- **Input validation** with Zod schemas
- **Rate limiting** on API endpoints
- **CORS protection** for cross-origin requests
- **Error handling** without information leakage

## 📈 **Performance & Monitoring**

### **Optimization Strategies**
- **Server-side rendering** for initial page loads
- **Client-side hydration** for interactivity
- **Database indexing** on frequently queried fields
- **Queue-based processing** for long-running tasks
- **Caching** for frequently accessed data

### **Monitoring & Observability**
- **Structured logging** with consistent format
- **Error tracking** with stack traces
- **Performance metrics** for key operations
- **Health checks** for all services
- **Execution metrics** and performance scoring

## 🚀 **Deployment**

### **Production Stack**
- **Frontend**: Vercel (Next.js)
- **Backend**: Render (Node.js + Puppeteer)
- **Database**: PostgreSQL (Render managed)
- **Queue**: Redis (Render managed)
- **Storage**: Local volumes for agent outputs

### **Docker Deployment**
```bash
# Build and run with Docker Compose
cd infra/
docker-compose up -d

# Production deployment
./deploy.sh
```

## 🔮 **Future Roadmap**

### **Planned Enhancements**
- **Multi-tenant architecture** for enterprise use
- **Advanced scheduling** with cron expressions
- **Plugin system** for custom actions
- **Analytics dashboard** for usage insights
- **API rate limiting** and usage quotas

### **Enterprise Features**
- **Advanced security** and compliance
- **Audit logging** and compliance reporting
- **Multi-region deployment** for global availability
- **Enterprise SSO** integration
- **Advanced monitoring** and alerting

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Follow the [Project Guidelines](./Project-Guidelines.md)
4. Add tests for new functionality
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.

---

**vergo** - Enterprise-grade AI agent automation platform built with modern web technologies and enterprise-grade security.