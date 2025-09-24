# CI/CD Dead Code Detection Setup

This document outlines the comprehensive CI/CD setup to eliminate dead code and ensure code quality through automated checks.

## 🎯 Overview

The CI/CD pipeline now includes multiple layers of dead code detection and quality assurance:

1. **TypeScript Strict Mode** - Compile-time unused variable detection
2. **ESLint Unused Imports** - Runtime unused import detection  
3. **Jest Coverage Thresholds** - Test coverage enforcement
4. **Depcheck** - Unused dependency detection
5. **GitHub Actions** - Automated CI/CD pipeline

## 🔧 Configuration Details

### 1. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**What it does:**
- Breaks builds if unused local variables exist
- Breaks builds if unused function parameters exist
- Enforces clean code at compile time

**Usage:**
```bash
npm run type-check
```

### 2. ESLint Configuration (`eslint.config.mjs`)

```javascript
{
  plugins: {
    "unused-imports": (await import("eslint-plugin-unused-imports")).default,
  },
  rules: {
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        "vars": "all",
        "varsIgnorePattern": "^_",
        "args": "after-used", 
        "argsIgnorePattern": "^_"
      }
    ]
  }
}
```

**What it does:**
- Flags unused imports as errors
- Warns about unused variables (except those starting with `_`)
- Allows unused parameters starting with `_`

**Usage:**
```bash
npm run lint
npm run lint:unused
```

### 3. Jest Coverage Configuration (`jest.config.js`)

```javascript
{
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

**What it does:**
- Enforces 80% coverage across all metrics
- Fails builds if coverage drops below thresholds
- Identifies untested code paths

**Usage:**
```bash
npm run coverage
npm run coverage:threshold
```

### 4. Depcheck Configuration

```bash
npx depcheck
```

**What it does:**
- Scans for unused dependencies
- Identifies missing dependencies
- Flags orphaned packages

**Usage:**
```bash
npm run dead-code
```

## 🚀 NPM Scripts

### New Scripts Added

```json
{
  "scripts": {
    "lint:unused": "eslint . --ext .ts,.tsx --rule 'unused-imports/no-unused-imports: error'",
    "coverage": "jest --coverage",
    "coverage:threshold": "jest --coverage --coverageThreshold.global.branches=80 --coverageThreshold.global.functions=80 --coverageThreshold.global.lines=80 --coverageThreshold.global.statements=80",
    "dead-code": "npx depcheck",
    "ci": "npm run lint && npm run type-check && npm run coverage:threshold && npm run dead-code"
  }
}
```

### Script Usage

```bash
# Check for unused imports specifically
npm run lint:unused

# Run tests with coverage
npm run coverage

# Run tests with coverage thresholds
npm run coverage:threshold

# Check for unused dependencies
npm run dead-code

# Run all CI checks locally
npm run ci
```

## 🔄 GitHub Actions Workflow

### Workflow Structure

The CI pipeline includes 5 jobs:

1. **build-and-test** - Core testing and linting
2. **security-scan** - Security vulnerability checks
3. **dead-code-detection** - Unused code detection
4. **integration-tests** - End-to-end workflow tests
5. **build-production** - Production build verification

### Key Features

- **Redis Service**: Automated Redis setup for tests
- **Chrome Dependencies**: Automated browser setup for integration tests
- **Coverage Reports**: Upload to Codecov for tracking
- **Security Audits**: Automated vulnerability scanning
- **Dead Code Detection**: Multiple layers of unused code detection

### Workflow Triggers

```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
```

## 🛡️ Security Configuration

### Audit-CI Configuration (`audit-ci.json`)

```json
{
  "low": true,
  "moderate": true,
  "high": true,
  "critical": true,
  "allowlist": [],
  "skip-dev": false,
  "report-type": "summary",
  "output-format": "text"
}
```

**What it does:**
- Fails builds on any security vulnerabilities
- Includes dev dependencies in security checks
- Provides summary reports

## 📊 Coverage Thresholds

### Current Thresholds

- **Branches**: 80%
- **Functions**: 80%  
- **Lines**: 80%
- **Statements**: 80%

### Coverage Collection

```javascript
{
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app/api/auth/**', // Exclude auth routes
  ]
}
```

**Excluded from Coverage:**
- Type definition files (`*.d.ts`)
- Authentication routes (security-sensitive)
- Node modules
- Build artifacts

## 🔍 Dead Code Detection Layers

### Layer 1: TypeScript Compiler
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- Compile-time detection
- Breaks builds immediately

### Layer 2: ESLint
- `unused-imports/no-unused-imports: error`
- `unused-imports/no-unused-vars: warn`
- Runtime detection
- IDE integration

### Layer 3: Jest Coverage
- 80% threshold enforcement
- Identifies untested code paths
- Branch coverage analysis
- Function coverage tracking

### Layer 4: Depcheck
- Unused dependency detection
- Missing dependency identification
- Package.json analysis
- Node modules scanning

## 🚨 Failure Scenarios

### TypeScript Failures
```bash
# Unused local variable
const unusedVar = 'test'; // ❌ Build fails

# Unused parameter
function test(unusedParam: string) { // ❌ Build fails
  return 'test';
}
```

### ESLint Failures
```bash
# Unused import
import { unusedFunction } from './utils'; // ❌ Lint fails

# Unused variable
const unusedVar = 'test'; // ⚠️ Lint warning
```

### Coverage Failures
```bash
# Coverage below 80%
# ❌ Build fails with coverage report
```

### Depcheck Failures
```bash
# Unused dependency in package.json
# ❌ Build fails with dependency report
```

## 🛠️ Local Development

### Pre-commit Hooks

```bash
# Run before committing
npm run ci
```

### IDE Integration

Most IDEs will automatically show:
- TypeScript errors for unused variables
- ESLint warnings for unused imports
- Coverage highlighting for untested code

### Manual Checks

```bash
# Check everything locally
npm run ci

# Check specific issues
npm run lint:unused
npm run dead-code
npm run coverage:threshold
```

## 📈 Monitoring & Reporting

### Codecov Integration

Coverage reports are automatically uploaded to Codecov for:
- Historical tracking
- PR coverage comments
- Coverage trend analysis
- Team dashboards

### GitHub Actions Artifacts

Each workflow run produces:
- Coverage reports
- Lint results
- Security audit results
- Dead code detection reports

## 🔧 Troubleshooting

### Common Issues

#### TypeScript Errors
```bash
# Fix unused variables
# Remove or use the variable
const usedVar = 'test';
console.log(usedVar);
```

#### ESLint Warnings
```bash
# Remove unused imports
# Remove or use the import
import { usedFunction } from './utils';
```

#### Coverage Failures
```bash
# Add tests for uncovered code
# Or exclude from coverage if appropriate
```

#### Depcheck Failures
```bash
# Remove unused dependencies
npm uninstall unused-package

# Or add to package.json if needed
```

### Debug Commands

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check ESLint with verbose output
npx eslint . --ext .ts,.tsx --debug

# Check coverage with detailed report
npm run coverage -- --verbose

# Check dependencies with JSON output
npx depcheck --json
```

## 🎯 Best Practices

### Code Organization
- Use descriptive variable names
- Remove unused imports immediately
- Keep functions focused and testable
- Use TypeScript strict mode

### Testing Strategy
- Aim for 80%+ coverage
- Test edge cases and error conditions
- Use integration tests for complex workflows
- Mock external dependencies appropriately

### Dependency Management
- Regular dependency audits
- Remove unused packages promptly
- Keep dependencies up to date
- Use exact versions for critical packages

## 🚀 Future Enhancements

### Planned Improvements
- **Bundle Analysis**: Webpack bundle analyzer integration
- **Performance Monitoring**: Lighthouse CI integration
- **Visual Regression**: Screenshot comparison testing
- **Load Testing**: Automated performance testing

### Advanced Dead Code Detection
- **Tree Shaking Analysis**: Identify unused exports
- **Bundle Size Monitoring**: Track bundle size changes
- **Import Graph Analysis**: Visualize dependency relationships
- **Code Complexity Metrics**: Cyclomatic complexity tracking

## 📚 Resources

### Documentation
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [ESLint Unused Imports Plugin](https://github.com/sweepline/eslint-plugin-unused-imports)
- [Jest Coverage Configuration](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [Depcheck Documentation](https://github.com/depcheck/depcheck)

### Tools
- **TypeScript**: Static type checking
- **ESLint**: Code linting and formatting
- **Jest**: Testing and coverage
- **Depcheck**: Dependency analysis
- **GitHub Actions**: CI/CD automation
- **Codecov**: Coverage tracking

This setup ensures that dead code cannot creep back into the codebase and maintains high code quality standards across the entire project.
