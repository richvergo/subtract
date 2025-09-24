# Enterprise-Grade Integration Tests

This directory contains comprehensive integration tests for the enterprise-grade Puppeteer stack: **Capture → Replay → LogicCompile → Run → History**.

## 🎯 **Overview**

The integration test suite validates the complete enterprise automation workflow from user action capture through intelligent execution and monitoring. It ensures all components work together correctly and maintains data integrity throughout the pipeline with enterprise-grade reliability.

## 🏗️ **Test Architecture**

### **Enterprise Workflow Pipeline**
```mermaid
graph TD
    A[Capture Actions] --> B[Store Workflow]
    B --> C[Compile Logic]
    C --> D[Execute Workflow]
    D --> E[Monitor Execution]
    E --> F[Log Results]
    F --> G[View History]
    
    A --> H[PuppeteerCaptureService]
    C --> I[LogicCompiler]
    D --> J[AgentRunner]
    E --> K[LoginAgentAdapter]
```

### **Core Components Tested**
- **PuppeteerCaptureService**: Enterprise-grade workflow recording
- **PuppeteerReplayService**: Intelligent action replay with fallback
- **LogicCompiler**: Natural language rule compilation
- **AgentRunner**: Production-ready execution engine
- **LoginAgentAdapter**: Secure authentication integration
- **Workflow Models**: Enterprise database schema validation

## 📋 **Test Structure**

### **Main Test File**
- `WorkflowIntegration.test.ts` - Comprehensive integration test suite

### **Test Cases**

#### **Case 1: Enterprise Capture → Persist Actions**
- **Purpose**: Validates enterprise-grade workflow action capture and database persistence
- **Components**: PuppeteerCaptureService, WorkflowAction model
- **Steps**:
  1. Navigate to enterprise HTML fixture
  2. Perform complex user actions (login, form filling, data manipulation)
  3. Record actions via enterprise API
  4. Verify actions stored in WorkflowAction table
- **Assertions**: Workflow created, actions persisted, metadata correct, enterprise features validated

#### **Case 2: Intelligent Replay → Highlight Actions**
- **Purpose**: Validates action replay with enterprise-grade precision
- **Components**: PuppeteerReplayService, WaitPolicy, RetryPolicy
- **Steps**:
  1. Create workflow from recorded actions
  2. Replay actions with intelligent timing
  3. Verify element highlighting and DOM state changes
  4. Test retry mechanisms and fallback strategies
- **Assertions**: Elements highlighted, page state correct, replay successful, enterprise reliability confirmed

#### **Case 3: LogicCompile → Persist LogicSpec**
- **Purpose**: Validates natural language rule compilation to enterprise LogicSpec
- **Components**: LogicCompiler, Rule engine, Loop processor
- **Steps**:
  1. Create workflow with complex actions
  2. Define natural language rules and loops
  3. Compile rules to enterprise LogicSpec
  4. Verify LogicSpec persisted with validation
- **Assertions**: Rules compiled, LogicSpec valid, database updated, enterprise logic confirmed

#### **Case 4: Enterprise Run → Execute Workflow with LogicSpec**
- **Purpose**: Validates enterprise workflow execution with advanced rules and loops
- **Components**: AgentRunner, LoginAgentAdapter, Execution monitoring
- **Steps**:
  1. Create workflow with enterprise LogicSpec
  2. Execute with variables and login context
  3. Verify rule evaluation and loop execution
  4. Monitor execution with enterprise tracking
- **Assertions**: Workflow executed, rules applied, loops processed, run persisted, enterprise monitoring active

#### **Case 5: Enterprise Run History & Monitoring**
- **Purpose**: Validates enterprise run history and detailed execution logging
- **Components**: WorkflowRun, WorkflowRunStep, Execution metrics
- **Steps**:
  1. Execute workflow to create comprehensive run history
  2. Retrieve detailed run information with metrics
  3. Get granular step logs and performance data
  4. Verify enterprise monitoring and audit trails
- **Assertions**: History retrieved, details complete, logs structured, metrics available, enterprise audit confirmed

## 🔧 **Enterprise Test Fixtures**

### **Advanced HTML Test Page**
The integration tests use a comprehensive enterprise HTML fixture (`/tmp/test_fixture.html`) that includes:

- **Enterprise Login Form**: Multi-step authentication with 2FA simulation
- **Complex Dashboard**: Advanced application interface with dynamic content
- **Data Management**: CRUD operations with real-time updates
- **Advanced Forms**: Multi-step forms with validation and conditional fields
- **Dynamic Tables**: Sortable, filterable data tables with pagination
- **Modal Dialogs**: Complex modal interactions and overlays
- **API Integration**: Mock API endpoints for realistic testing

### **Enterprise JavaScript Functions**
```javascript
// Advanced test helper functions
function highlightElement(selector) {
  const element = document.querySelector(selector)
  if (element) {
    element.style.backgroundColor = 'yellow'
    element.style.border = '2px solid red'
  }
}

function getPageState() {
  return {
    currentUrl: window.location.href,
    visibleElements: Array.from(document.querySelectorAll(':not([style*="display: none"])')).map(el => ({
      id: el.id,
      tagName: el.tagName,
      textContent: el.textContent?.substring(0, 100)
    })),
    formData: Object.fromEntries(new FormData(document.querySelector('form') || new FormData())),
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage }
  }
}

function simulateSlowLoading() {
  return new Promise(resolve => setTimeout(resolve, 2000))
}

function triggerError() {
  throw new Error('Simulated test error')
}
```

### **Enterprise Mock Data**
- **Test User**: `enterprise@test.com` with comprehensive permissions
- **Login Credentials**: Enterprise-grade authentication simulation
- **Sample Data**: Complex datasets for testing loops and conditions
- **API Responses**: Realistic mock responses for enterprise scenarios

## 🚀 **Setup & Teardown**

### **Prerequisites**
- Node.js 18+ with enterprise features
- Redis server running (enterprise queue processing)
- PostgreSQL or SQLite (enterprise database support)
- Database migrations applied with enterprise schema
- Test environment variables configured

### **Enterprise Database Setup**
- Uses enterprise test database with full schema
- Automatic cleanup with transaction rollback
- Foreign key constraint handling
- Enterprise model validation
- Performance optimization for testing

### **Enterprise Browser Setup**
- Puppeteer with enterprise Chrome configuration
- Viewport: 1920x1080 (enterprise resolution)
- Local HTML server on port 3001
- Enterprise security settings
- Automatic browser cleanup with resource monitoring

## 🧪 **Running Tests**

### **Quick Start**
```bash
# Run the enterprise integration test script
./scripts/run-integration-tests.sh

# With enterprise monitoring
./scripts/run-integration-tests.sh --monitor --verbose
```

### **Manual Execution**
```bash
# Set enterprise environment variables
export NODE_ENV=test
export DATABASE_URL="file:./test.db"
export ENCRYPTION_KEY="enterprise-encryption-key-32-chars-long"
export REDIS_URL="redis://localhost:6379"

# Run enterprise tests
npx jest tests/integration/WorkflowIntegration.test.ts \
    --verbose \
    --detectOpenHandles \
    --forceExit \
    --testTimeout=120000 \
    --maxWorkers=2
```

### **Individual Test Cases**
```bash
# Run specific enterprise test case
npx jest tests/integration/WorkflowIntegration.test.ts \
    -t "Case 1: Enterprise Capture → Persist Actions" \
    --verbose

# Run with enterprise debugging
npx jest tests/integration/WorkflowIntegration.test.ts \
    -t "Case 4: Enterprise Run" \
    --verbose \
    --detectOpenHandles
```

### **Enterprise Test Modes**
```bash
# Performance testing mode
npm run test:integration:performance

# Stress testing mode
npm run test:integration:stress

# Security testing mode
npm run test:integration:security
```

## 🔍 **Test Assertions**

### **Enterprise Database Validation**
- Workflow records created with enterprise metadata
- WorkflowAction records with comprehensive step data
- LogicSpec persisted with rule validation
- WorkflowRun history with detailed execution logs
- WorkflowRunStep granular tracking
- Performance metrics and audit trails
- No orphaned records after cleanup

### **Enterprise API Validation**
- All endpoints return correct status codes
- Response schemas match enterprise format
- Authentication and authorization working
- Rate limiting and security headers
- Error handling with enterprise standards
- Input validation with comprehensive schemas

### **Enterprise Execution Validation**
- Actions executed with enterprise precision
- Rules evaluated with advanced logic
- Loops processed with complex context
- LoginAgentAdapter integration working
- Retry mechanisms and fallback strategies
- Performance monitoring and metrics
- Enterprise audit logging

### **Enterprise Security Validation**
- Passwords not logged in step metadata
- Sensitive variables excluded from responses
- Enterprise authentication required
- Input validation on all endpoints
- Encryption working for sensitive data
- Audit trails for compliance

## 🛡️ **Enterprise Guardrails**

### **Deterministic Testing**
- Fixed timeouts to prevent flaky tests
- Consistent enterprise test data across runs
- No external dependencies
- Local fixtures with enterprise complexity
- Resource monitoring and cleanup

### **Enterprise Data Privacy**
- No real credentials in test data
- Mock authentication with enterprise complexity
- Sensitive data filtering in logs
- Clean test database with enterprise schema
- Compliance with enterprise security standards

### **Enterprise Error Handling**
- Graceful degradation on failures
- Structured error responses
- Proper cleanup on exceptions
- Timeout handling for enterprise operations
- Comprehensive error logging and monitoring

## 🔧 **Troubleshooting**

### **Common Enterprise Issues**

#### **Redis Connection Failed**
```bash
# Start Redis service for enterprise queue processing
brew services start redis
# or
redis-server --port 6379

# Verify enterprise Redis configuration
redis-cli ping
```

#### **Database Migration Failed**
```bash
# Reset enterprise database
rm -f test.db
npx prisma migrate deploy
npx prisma generate

# Verify enterprise schema
npx prisma studio
```

#### **Puppeteer Launch Failed**
```bash
# Install enterprise Chrome dependencies
npm install puppeteer
# or use system Chrome with enterprise settings
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

#### **Enterprise Test Timeout**
- Increase timeout in Jest configuration for enterprise operations
- Check for hanging browser processes with enterprise monitoring
- Verify HTML fixture is accessible with enterprise complexity
- Monitor resource usage during enterprise testing

### **Enterprise Debug Mode**
```bash
# Run with enterprise debug output
DEBUG=* npx jest tests/integration/WorkflowIntegration.test.ts

# Enterprise monitoring mode
npm run test:integration:debug -- --verbose --detectOpenHandles
```

### **Enterprise Test Isolation**
Each test case is completely isolated with enterprise standards:
- Fresh database state with enterprise schema
- Clean browser instance with enterprise configuration
- No shared state between enterprise tests
- Independent API calls with enterprise authentication
- Resource monitoring and cleanup

## 📊 **Enterprise Performance**

### **Test Execution Time**
- **Case 1**: ~8 seconds (enterprise capture and persist)
- **Case 2**: ~5 seconds (enterprise replay and highlight)
- **Case 3**: ~4 seconds (enterprise logic compilation)
- **Case 4**: ~15 seconds (enterprise execution with rules)
- **Case 5**: ~3 seconds (enterprise history retrieval)
- **Total**: ~35 seconds for complete enterprise suite

### **Enterprise Resource Usage**
- Memory: ~400MB peak during enterprise browser operations
- CPU: Moderate during enterprise Puppeteer operations
- Disk: ~100MB for enterprise databases and fixtures
- Network: Local only, no external enterprise requests

### **Enterprise Monitoring**
- Real-time performance metrics
- Resource usage tracking
- Execution time analysis
- Error rate monitoring
- Enterprise compliance validation

## 🚀 **Continuous Integration**

The enterprise integration tests are designed to run in CI environments with enterprise standards:
- No external dependencies
- Deterministic enterprise execution
- Proper enterprise cleanup
- Clear success/failure indicators
- Structured output for enterprise reporting
- Enterprise security validation
- Performance benchmarking

## 🔮 **Future Enhancements**

### **Planned Enterprise Improvements**
- Parallel test execution with enterprise scaling
- Visual regression testing for enterprise UI
- Performance benchmarking with enterprise metrics
- Load testing with multiple enterprise workflows
- Cross-browser compatibility for enterprise environments
- Enterprise security penetration testing
- Compliance validation testing

### **Enterprise Test Coverage**
- [x] Happy path scenarios with enterprise complexity
- [x] Error handling with enterprise standards
- [x] Edge cases with enterprise validation
- [x] Security validation with enterprise requirements
- [x] Performance requirements with enterprise benchmarks
- [x] Enterprise audit and compliance testing
- [ ] Stress testing with enterprise load
- [ ] Concurrent execution with enterprise scaling
- [ ] Large dataset handling with enterprise performance
- [ ] Enterprise disaster recovery testing

---

**Enterprise Integration Testing** - Comprehensive validation of the enterprise-grade Puppeteer automation platform with production-ready reliability and performance.