# Test Plan: Enriched Event Logs & Multi-Signal Capture

## Overview
This test plan covers comprehensive testing of the new enriched event logs system with multi-signal capture (URLs, keystrokes, screenshots) and the associated backend enhancements.

## Test Categories

### 1. Database Schema & Migration Tests

#### 1.1 Event Model Creation
- [ ] **Test**: Event table exists with correct schema
  - Fields: `id`, `agentId`, `step`, `action`, `target`, `value`, `url`, `elementType`, `elementText`, `screenshotUrl`, `createdAt`
  - Indexes: `agentId` and `step` for efficient querying
  - Foreign key relationship to Agent table

#### 1.2 Migration Validation
- [ ] **Test**: Migration applies successfully without data loss
- [ ] **Test**: Existing agents remain functional after migration
- [ ] **Test**: Prisma client generates correctly with new Event model

#### 1.3 Data Integrity
- [ ] **Test**: Event records can be created with valid data
- [ ] **Test**: Cascade deletion works (deleting agent deletes events)
- [ ] **Test**: Unique constraints and indexes function properly

### 2. API Endpoint Tests

#### 2.1 POST /api/agents/record-events
- [ ] **Test**: Creates agent with enriched event logs
- [ ] **Test**: Processes inline screenshots and stores them
- [ ] **Test**: Validates event log schema with Zod
- [ ] **Test**: Excludes password values from event logs
- [ ] **Test**: Stores events in both Event table and eventLog JSON
- [ ] **Test**: Links agent to provided login IDs
- [ ] **Test**: Returns complete agent data with events

**Test Cases:**
```json
// Valid request with screenshots
{
  "name": "Test Agent",
  "purposePrompt": "Test workflow",
  "eventLog": [
    {
      "step": 1,
      "action": "navigate",
      "target": "https://example.com",
      "url": "https://example.com",
      "timestamp": 1703123456789,
      "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    }
  ]
}

// Invalid request (password in value)
{
  "eventLog": [
    {
      "step": 1,
      "action": "type",
      "target": "input[name='password']",
      "value": "secretpassword123" // Should be rejected
    }
  ]
}
```

#### 2.2 GET /api/agents/[id]/review (Enhanced)
- [ ] **Test**: Returns agent with events array
- [ ] **Test**: Events are ordered by step
- [ ] **Test**: Screenshot URLs are included
- [ ] **Test**: Maintains backward compatibility with eventLog field

#### 2.3 POST /api/agents/[id]/summarize (Enhanced)
- [ ] **Test**: Uses new validation schema
- [ ] **Test**: Includes screenshot count in LLM prompt
- [ ] **Test**: Generates enhanced summary with visual context
- [ ] **Test**: Updates agent with processed event log

### 3. Screenshot Storage Tests

#### 3.1 File Storage Validation
- [ ] **Test**: Screenshots stored in `/uploads/events/` directory
- [ ] **Test**: Filename format: `{agentId}_{step}_{timestamp}.{extension}`
- [ ] **Test**: File size limit enforced (200KB max)
- [ ] **Test**: MIME type validation (PNG/JPEG only)
- [ ] **Test**: Base64 decoding works correctly

#### 3.2 Security Tests
- [ ] **Test**: Filename sanitization prevents path traversal
- [ ] **Test**: Invalid file types rejected
- [ ] **Test**: Oversized files rejected
- [ ] **Test**: Malformed base64 data handled gracefully

#### 3.3 File Operations
- [ ] **Test**: Directory creation if not exists
- [ ] **Test**: File write permissions
- [ ] **Test**: File cleanup on agent deletion
- [ ] **Test**: URL generation for stored files

### 4. Security & Authentication Tests

#### 4.1 Authentication
- [ ] **Test**: All endpoints require valid session
- [ ] **Test**: Unauthenticated requests return 401
- [ ] **Test**: User can only access their own agents
- [ ] **Test**: Cross-user access blocked

#### 4.2 Data Security
- [ ] **Test**: Password values excluded from event logs
- [ ] **Test**: Sensitive URLs redacted
- [ ] **Test**: Input validation prevents injection
- [ ] **Test**: File upload security measures

#### 4.3 Authorization
- [ ] **Test**: Agent ownership validation
- [ ] **Test**: Event access restricted to agent owner
- [ ] **Test**: Screenshot access controlled

### 5. Validation & Schema Tests

#### 5.1 Event Log Schema Validation
- [ ] **Test**: Required fields validated
- [ ] **Test**: Action enum validation
- [ ] **Test**: URL format validation
- [ ] **Test**: Timestamp validation
- [ ] **Test**: Step number validation

#### 5.2 Screenshot Validation
- [ ] **Test**: Base64 format validation
- [ ] **Test**: MIME type validation
- [ ] **Test**: File size validation
- [ ] **Test**: Data URL parsing

### 6. Integration Tests

#### 6.1 End-to-End Workflow
- [ ] **Test**: Complete agent creation with enriched events
- [ ] **Test**: Screenshot processing and storage
- [ ] **Test**: Event retrieval and display
- [ ] **Test**: Enhanced summarization with visual context

#### 6.2 Error Handling
- [ ] **Test**: Invalid event data handled gracefully
- [ ] **Test**: Screenshot processing failures don't break agent creation
- [ ] **Test**: Database errors handled properly
- [ ] **Test**: File system errors handled gracefully

### 7. Performance Tests

#### 7.1 Database Performance
- [ ] **Test**: Event table queries perform well with large datasets
- [ ] **Test**: Indexes improve query performance
- [ ] **Test**: Bulk event insertion efficient

#### 7.2 File Storage Performance
- [ ] **Test**: Screenshot storage doesn't block API responses
- [ ] **Test**: Concurrent screenshot uploads handled
- [ ] **Test**: Large screenshot processing performance

### 8. Backward Compatibility Tests

#### 8.1 Legacy Support
- [ ] **Test**: Existing agents without events work normally
- [ ] **Test**: Old eventLog JSON field still functional
- [ ] **Test**: API responses maintain backward compatibility
- [ ] **Test**: Frontend can handle both old and new data formats

## Test Execution Plan

### Phase 1: Unit Tests
1. Database schema validation
2. API endpoint functionality
3. Screenshot storage logic
4. Validation schemas

### Phase 2: Integration Tests
1. End-to-end workflows
2. Error handling scenarios
3. Security validation
4. Performance testing

### Phase 3: Compatibility Tests
1. Backward compatibility
2. Migration validation
3. Cross-browser testing
4. Edge case handling

## Test Data Requirements

### Sample Event Logs
```json
{
  "eventLog": [
    {
      "step": 1,
      "action": "navigate",
      "target": "https://slides.google.com",
      "url": "https://slides.google.com",
      "elementType": "page",
      "elementText": "Google Slides",
      "timestamp": 1703123456789
    },
    {
      "step": 2,
      "action": "click",
      "target": "button[data-action='create']",
      "url": "https://slides.google.com",
      "elementType": "button",
      "elementText": "Blank presentation",
      "timestamp": 1703123460000,
      "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    },
    {
      "step": 3,
      "action": "type",
      "target": "input[name='title']",
      "value": "Q1 Sales Plan",
      "url": "https://docs.google.com/presentation/d/abc123",
      "elementType": "input",
      "elementText": "Untitled presentation",
      "timestamp": 1703123465000
    }
  ]
}
```

### Test Screenshots
- Valid PNG screenshot (base64 encoded)
- Valid JPEG screenshot (base64 encoded)
- Invalid file type
- Oversized file
- Malformed base64 data

## Success Criteria

### Functional Requirements
- [ ] All API endpoints work as documented
- [ ] Screenshots stored and retrieved correctly
- [ ] Event data validated and stored properly
- [ ] Security measures enforced
- [ ] Backward compatibility maintained

### Performance Requirements
- [ ] API responses under 2 seconds
- [ ] Screenshot processing under 5 seconds
- [ ] Database queries optimized
- [ ] File storage efficient

### Security Requirements
- [ ] No password data in event logs
- [ ] File upload security enforced
- [ ] Authentication required for all operations
- [ ] Authorization properly implemented

## Test Environment Setup

### Prerequisites
- Clean database with latest migration
- Test user accounts created
- Upload directories created
- Test screenshots prepared

### Test Execution
1. Run unit tests for individual components
2. Execute integration tests for workflows
3. Perform security validation tests
4. Validate performance requirements
5. Test backward compatibility

### Cleanup
- Remove test data after completion
- Clean up uploaded files
- Reset database state
- Document any issues found
