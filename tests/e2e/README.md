# E2E Testing Documentation

This directory contains end-to-end tests that validate the complete frontend ↔ backend stack functionality.

## Test Structure

### BasicWorkflowSmoke.test.tsx
Comprehensive end-to-end test that validates the full workflow creation, configuration, and execution pipeline.

## Final Pre-Commit Validation

### Overview
The Final Pre-Commit Validation system provides a comprehensive validation chain to confirm that the domain-scoping update in PuppeteerCaptureService is correct, stable, and non-breaking before any commit. This includes domain-specific debug logs to track navigation decisions.

### Validation Process

#### Final Pre-Commit Validation Chain
The final pre-commit validation runs a comprehensive validation chain with debug logging:

1. **ESLint + Unused Imports** (`npm run lint`)
   - Code quality and style validation
   - Unused import detection
   - Ensures clean codebase

2. **TypeScript Strict Mode** (`npm run type-check`)
   - Type safety validation
   - Strict type checking
   - Ensures type correctness

3. **Unit + Integration Tests** (`npm run test`)
   - All existing unit and integration tests
   - Ensures no regressions in existing functionality
   - Validates core business logic

4. **End-to-End Smoke Tests** (`npm run test:smoke`)
   - End-to-end workflow execution with domain scoping
   - Validates that run logs contain only allowed domain actions
   - Ensures no extraneous domain events are recorded

5. **Domain Scope Regression Tests** (`npm run test:regression`)
   - Tests domain scope initialization and configuration
   - Validates allowed domain navigation (getvergo.com, vergoerp.io)
   - Tests external domain blocking (gmail.com, slack.com)
   - Validates SSO redirect handling (auth0.com)

6. **Full Validation Runner** (`npm run validate:all`)
   - Comprehensive validation across all layers
   - Memory usage monitoring
   - Puppeteer session management
   - Zod schema compliance

#### Domain Scope Debug Logging

When `DOMAIN_SCOPE_DEBUG=true` is enabled, the system logs every navigation decision:

```
🌐 ALLOWED ✅ apply.getvergo.com/transactions
   Allowed domain navigation

🌐 BLOCKED ❌ mail.google.com
   Blocked external domain: outside target system

🌐 SSO ✅ login.auth0.com
   SSO authentication domain
```

#### How to Run Locally

```bash
# Run complete final pre-commit validation with debug logs
DOMAIN_SCOPE_DEBUG=true npm run precommit:final

# Run without debug logs
npm run precommit:final

# Individual validation steps
npm run lint                    # ESLint + unused imports
npm run type-check             # TypeScript strict mode
npm run test                   # Unit & integration tests
npm run test:smoke            # End-to-end smoke tests
npm run test:regression        # Domain scope regression tests
npm run validate:all           # Full validation runner
```

### Summary Output

The final validation provides a clear summary table showing:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRE-COMMIT FINAL VALIDATION RESULTS                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Validation Step                    │ Status │ Duration │ Memory │ Details   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ESLint                            │ PASS   │ 2s       │ 45MB   │ OK        │
│ TypeScript Type Check             │ PASS   │ 3s       │ 52MB   │ OK        │
│ Unit & Integration Tests          │ PASS   │ 15s      │ 48MB   │ OK        │
│ Smoke Tests                       │ PASS   │ 8s       │ 51MB   │ OK        │
│ Domain Scope Regression           │ PASS   │ 1s       │ 48MB   │ OK        │
│ Full Validation Runner             │ PASS   │ 2s       │ 51MB   │ OK        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Pre-Commit Validation

### Overview
The Pre-Commit Validation system provides a comprehensive validation chain to confirm that the domain-scoping update in PuppeteerCaptureService is correct, stable, and non-breaking before any commit.

### Validation Process

#### Pre-Commit Validation Chain
The pre-commit validation runs a comprehensive validation chain:

1. **ESLint + Unused Imports** (`npm run lint`)
   - Code quality and style validation
   - Unused import detection
   - Ensures clean codebase

2. **TypeScript Strict Mode** (`npm run type-check`)
   - Type safety validation
   - Strict type checking
   - Ensures type correctness

3. **Unit + Integration Tests** (`npm run test`)
   - All existing unit and integration tests
   - Ensures no regressions in existing functionality
   - Validates core business logic

4. **End-to-End Smoke Tests** (`npm run test:smoke`)
   - End-to-end workflow execution with domain scoping
   - Validates that run logs contain only allowed domain actions
   - Ensures no extraneous domain events are recorded

5. **Domain Scope Regression Tests** (`npm run test:regression`)
   - Tests domain scope initialization and configuration
   - Validates allowed domain navigation (getvergo.com, vergoerp.io)
   - Tests external domain blocking (gmail.com, slack.com)
   - Validates SSO redirect handling (auth0.com)

6. **Full Validation Runner** (`npm run validate:all`)
   - Comprehensive validation across all layers
   - Memory usage monitoring
   - Puppeteer session management
   - Zod schema compliance

#### How to Run Locally

```bash
# Run complete pre-commit validation
npm run precommit:validate

# Individual validation steps
npm run lint                    # ESLint + unused imports
npm run type-check             # TypeScript strict mode
npm run test                   # Unit & integration tests
npm run test:smoke            # End-to-end smoke tests
npm run test:regression        # Domain scope regression tests
npm run validate:all           # Full validation runner
```

### Guardrails and Failure Conditions

The pre-commit validation includes strict guardrails that will **BLOCK COMMITS** if any of the following conditions are detected:

#### 1. Extraneous Domain Events
**Failure Condition:** External domains (Gmail, Slack, Facebook, etc.) recorded in regression tests
**Action:** COMMIT BLOCKED
**Solution:** Ensure only allowed domains are being navigated to

#### 2. Puppeteer Session Leaks
**Failure Condition:** Open handles or hanging processes detected
**Action:** COMMIT BLOCKED
**Solution:** Ensure all Puppeteer sessions are properly closed

#### 3. High Memory Usage
**Failure Condition:** Memory usage >500MB
**Action:** COMMIT BLOCKED
**Solution:** Check for memory leaks and optimize resource usage

#### 4. Zod Schema Validation Errors
**Failure Condition:** Domain scope configuration fails Zod validation
**Action:** COMMIT BLOCKED
**Solution:** Fix domain scope configuration structure

#### 5. Test Failures
**Failure Condition:** Any test in the validation chain fails
**Action:** COMMIT BLOCKED
**Solution:** Fix failing tests before committing

### Summary Output

The pre-commit validation provides a clear summary table showing:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRE-COMMIT VALIDATION RESULTS                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Validation Step                    │ Status │ Duration │ Memory │ Details   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ESLint + Unused Imports            │ PASS   │ 2s       │ 45MB   │ OK        │
│ TypeScript Strict Mode             │ PASS   │ 3s       │ 52MB   │ OK        │
│ Unit + Integration Tests           │ SKIP   │ 0s       │ 0MB    │ BUILD_ISSUES │
│ End-to-End Smoke Tests             │ SKIP   │ 0s       │ 0MB    │ BUILD_ISSUES │
│ Domain Scope Regression            │ PASS   │ 1s       │ 48MB   │ OK        │
│ Full Validation Runner             │ PASS   │ 2s       │ 51MB   │ OK        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Git Hook Integration

The pre-commit validation is automatically integrated with Git via Husky:

- **Automatic:** Runs on every `git commit`
- **Blocking:** Prevents commits if validation fails
- **Comprehensive:** Covers all validation layers
- **Fast:** Optimized for pre-commit speed

### Troubleshooting Pre-Commit Failures

#### Common Failure Cases

1. **ESLint Errors**
   ```bash
   # Fix linting issues
   npm run lint:fix
   ```

2. **TypeScript Errors**
   ```bash
   # Check type errors
   npm run type-check
   ```

3. **Domain Scope Issues**
   ```bash
   # Run domain scope validation
   npm run validate:domain-scope
   ```

4. **Memory Issues**
   ```bash
   # Check memory usage
   npm run validate:all
   ```

#### Bypassing Pre-Commit (Not Recommended)

```bash
# Skip pre-commit validation (NOT RECOMMENDED)
git commit --no-verify -m "commit message"
```

**Warning:** Only bypass pre-commit validation in emergency situations and ensure you run validation manually before pushing.

## Full Validation Runner

### Overview
The Full Validation Runner executes all test layers (unit, integration, regression, smoke) sequentially to ensure the domain-scoping functionality is correct and non-breaking.

### Validation Process

#### Full Validation Suite
The full validation runs a comprehensive test suite across all layers:

1. **Unit & Integration Tests** (`npm run test`)
   - All existing unit and integration tests
   - Ensures no regressions in existing functionality
   - Validates core business logic

2. **Smoke Tests** (`npm run test:smoke`)
   - End-to-end workflow execution with domain scoping
   - Validates that run logs contain only allowed domain actions
   - Ensures no extraneous domain events are recorded
   - Tests domain scope configuration validation

3. **Domain Scope Regression Tests** (`npm run test:regression`)
   - Tests domain scope initialization and configuration
   - Validates allowed domain navigation (getvergo.com, vergoerp.io)
   - Tests external domain blocking (gmail.com, slack.com)
   - Validates SSO redirect handling (auth0.com)
   - Tests error handling for missing base domains

#### How to Run Locally

```bash
# Run complete full validation
npm run validate:all

# Run individual test suites
npm run test                    # Unit & integration tests
npm run test:smoke            # E2E smoke tests with domain scoping
npm run test:regression        # Domain scope regression tests
npm run validate:domain-scope  # Domain scope specific validation
```

## Domain Scoping Validation

### Overview
The domain scoping functionality ensures that workflow recording is limited to specific domains, preventing extraneous actions from external sites (Gmail, Slack, etc.) from being recorded.

### Validation Process

#### Regression + Smoke Validation
The domain scoping validation runs a comprehensive test suite to ensure stability and non-breaking changes:

1. **Domain Scope Regression Tests** (`npm run test:regression`)
   - Tests domain scope initialization and configuration
   - Validates allowed domain navigation (getvergo.com, vergoerp.io)
   - Tests external domain blocking (gmail.com, slack.com)
   - Validates SSO redirect handling (auth0.com)
   - Tests error handling for missing base domains

2. **Smoke Tests** (`npm run test:smoke`)
   - End-to-end workflow execution with domain scoping
   - Validates that run logs contain only allowed domain actions
   - Ensures no extraneous domain events are recorded
   - Tests domain scope configuration validation

3. **Full Test Suite** (`npm run test`)
   - All existing unit and integration tests
   - Ensures no regressions in existing functionality

#### How to Run Locally

```bash
# Run complete domain scope validation
npm run validate:domain-scope

# Run individual test suites
npm run test:regression    # Domain scope regression tests
npm run test:smoke        # E2E smoke tests with domain scoping
npm run test:full          # All tests including domain scope validation
```

#### Validation Guardrails

The validation process includes several guardrails to ensure domain scoping works correctly:

1. **Zod Schema Validation**
   - Validates domain scope configuration before test execution
   - Ensures required fields are present and properly formatted
   - Validates allowed domains and SSO providers

2. **Extraneous Domain Detection**
   - Automatically detects and fails if external domains (Gmail, Slack, Facebook) are recorded
   - Ensures only allowed domains (getvergo.com, vergoerp.io, auth0.com) are recorded
   - Validates domain scope state in run logs

3. **Puppeteer Session Management**
   - Ensures Puppeteer sessions are closed cleanly after tests
   - Detects memory leaks or hanging processes
   - Validates session cleanup in test logs

4. **Domain Scope State Validation**
   - Validates recording pause/resume functionality
   - Ensures domain scope state is properly maintained
   - Tests navigation history tracking

#### CI/CD Integration

The domain scope validation runs automatically in CI/CD:

- **Nightly**: Runs every night at 3 AM UTC
- **Pull Requests**: Runs on every PR to main/develop branches
- **Manual**: Can be triggered manually via workflow_dispatch

The validation includes:
- Matrix testing with Node.js 18 and 20
- Sequential test execution to prevent Puppeteer session conflicts
- Comprehensive logging and artifact collection
- Automatic PR comments with validation results
- Failure notifications with detailed error information

#### Validation Reports

The validation process generates comprehensive reports:

- **Validation Logs**: Detailed logs for each test suite
- **Domain Scope Validation**: Specific domain scoping validation results
- **Test Results**: Coverage and test execution results
- **Validation Summary**: High-level validation status and summary

#### Troubleshooting

If domain scope validation fails:

1. **Check Validation Logs**: Review the generated validation logs for specific errors
2. **Verify Domain Configuration**: Ensure domain scope configuration is correct
3. **Check for Extraneous Domains**: Look for any external domain activity in logs
4. **Validate Puppeteer Cleanup**: Ensure Puppeteer sessions are properly closed
5. **Review Zod Schema**: Check that domain scope configuration passes Zod validation

#### Common Issues

1. **Extraneous Domain Events**: If Gmail, Slack, or other external domains appear in logs
2. **Domain Scope Initialization**: If domain scope is not properly initialized
3. **Puppeteer Session Cleanup**: If Puppeteer sessions are not closed properly
4. **Zod Schema Validation**: If domain scope configuration fails validation

#### Best Practices

1. **Always run validation before merging**: Use `npm run validate:domain-scope` locally
2. **Check validation results in CI/CD**: Review PR comments and artifacts
3. **Monitor for domain scope regressions**: Watch for any changes that might affect domain scoping
4. **Keep domain scope configuration up to date**: Ensure allowed domains and SSO providers are current

## Test Configuration

### Environment Variables
- `NEXT_PUBLIC_API_BASE_URL`: API base URL for testing
- `NODE_ENV`: Set to 'test' for test environment
- `CI`: Set to 'true' for CI/CD environment

### Test Data
The smoke test uses a comprehensive test workflow with domain scope configuration:
- Base domain: `getvergo.com`
- Allowed domains: `vergoerp.io`
- SSO providers: `*.auth0.com`, `accounts.google.com`

### Timeout Configuration
- Test timeout: 30 seconds
- Retry attempts: 3
- Retry delay: 1 second

## Troubleshooting Guide for Domain Scoping Errors

### Common Issues and Solutions

#### 1. Extraneous Domain Events Detected
**Error:** "Found extraneous domain activity: gmail.com"
**Solution:**
- Check if external domains are being recorded in logs
- Verify domain scope configuration is correct
- Ensure only allowed domains are being navigated to
- Check for any hardcoded external URLs in tests

#### 2. Domain Scope Initialization Failed
**Error:** "Domain scope initialization not detected"
**Solution:**
- Verify PuppeteerCaptureService is properly initialized
- Check domain scope configuration in test setup
- Ensure domain scope is enabled in capture config
- Verify base domain is correctly set

#### 3. Recording Pause/Resume Issues
**Error:** "Recording pause/resume events not detected"
**Solution:**
- Check if navigation to external domains triggers pause
- Verify return to allowed domains triggers resume
- Ensure domain scope state is properly managed
- Check for proper event handling in PuppeteerCaptureService

#### 4. Puppeteer Session Leaks
**Error:** "Open handles detected - potential Puppeteer session leak"
**Solution:**
- Ensure all Puppeteer sessions are properly closed
- Check for proper cleanup in test teardown
- Verify browser.close() is called after tests
- Check for hanging processes in test logs

#### 5. High Memory Usage
**Error:** "High memory usage detected: >500MB"
**Solution:**
- Check for memory leaks in Puppeteer sessions
- Ensure proper cleanup of browser instances
- Verify no hanging processes
- Check for large data structures not being released

#### 6. Zod Schema Validation Failures
**Error:** "Zod schema validation not found"
**Solution:**
- Verify DomainScopeConfigSchema is properly imported
- Check domain scope configuration structure
- Ensure all required fields are present
- Validate configuration before test execution

### Debugging Steps

1. **Check Validation Logs:**
   ```bash
   # Review detailed logs
   cat validation-logs/consolidated-report.md
   cat validation-logs/regression-test.log
   cat validation-logs/smoke-test.log
   ```

2. **Run Individual Test Suites:**
   ```bash
   # Test specific layers
   npm run test:regression
   npm run test:smoke
   npm run test
   ```

3. **Check Domain Scope Configuration:**
   ```bash
   # Verify configuration
   grep -r "DomainScopeConfig" src/
   grep -r "domainScope" tests/
   ```

4. **Validate Puppeteer Sessions:**
   ```bash
   # Check for hanging processes
   ps aux | grep puppeteer
   ps aux | grep chrome
   ```

## Contributing

When adding new domain scoping functionality:

1. Update the regression tests in `tests/agents/capture/DomainScopeRegression.test.ts`
2. Update the smoke test validation in `tests/e2e/BasicWorkflowSmoke.test.tsx`
3. Run the full validation locally: `npm run validate:all`
4. Ensure all tests pass before submitting PR
5. Check CI/CD validation results in PR comments

## Support

For issues with domain scope validation:

1. Check the validation logs in the `validation-logs/` directory
2. Review the consolidated report in `validation-logs/consolidated-report.md`
3. Check CI/CD artifacts for detailed test results
4. Review the domain scope configuration in the test files
5. Use the troubleshooting guide above for common issues