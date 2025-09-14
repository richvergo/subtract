# Contributing Guide

This guide outlines how to contribute to the vergo automation platform effectively and maintain code quality.

## 🌿 Branching Model

### Branch Structure
```
main (production)
├── develop (integration)
├── feature/feature-name
├── bugfix/bug-description
└── hotfix/critical-fix
```

### Branch Naming Conventions
- **Features**: `feature/add-agent-confirmation`
- **Bugfixes**: `bugfix/fix-login-validation`
- **Hotfixes**: `hotfix/security-patch`
- **Chores**: `chore/update-dependencies`

### Workflow
1. **Create feature branch** from `develop`
2. **Make changes** following coding standards
3. **Run quality checks** before committing
4. **Create pull request** to `develop`
5. **Code review** and approval
6. **Merge** to `develop`
7. **Deploy** to staging for testing
8. **Merge** to `main` for production

## 📝 Commit Conventions

### Conventional Commits Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```bash
# Feature
git commit -m "feat(agents): add agent confirmation workflow"

# Bug fix
git commit -m "fix(auth): resolve session timeout issue"

# Documentation
git commit -m "docs(api): update agent creation examples"

# Breaking change
git commit -m "feat(agents)!: change agent config schema

BREAKING CHANGE: agentConfig now requires metadata field"
```

## 🚪 CI Gates & Quality Checks

### Pre-commit Requirements
Before any commit, ensure:
```bash
# Run all quality checks
npm run pre-commit

# Individual checks
npm run lint          # Code quality
npm run type-check    # TypeScript validation
npm run test:unit     # Unit tests
npm run build         # Build verification
```

### Pull Request Requirements
All PRs must pass:

1. **Lint Check** - No ESLint errors
2. **Type Check** - No TypeScript errors
3. **Unit Tests** - All tests pass
4. **Integration Tests** - API tests pass
5. **Build Check** - Application builds successfully

### Automated Checks
- GitHub Actions run on every PR
- Quality checks enforced via workflow
- No merge allowed with failing checks

## 📚 Documentation Updates

### Required for Feature Changes
When adding new features, update:

1. **API Documentation**
   - Add endpoint documentation
   - Update schema examples
   - Document new parameters

2. **User Documentation**
   - Update README if needed
   - Add usage examples
   - Document new workflows

3. **Developer Documentation**
   - Update ARCHITECTURE.md for architectural changes
   - Update TESTING.md for new test patterns
   - Update DEVELOPMENT_GUIDELINES.md for new standards

### Documentation Standards
- **No stale documentation** - Keep docs in sync with code
- **Clear examples** - Provide working code samples
- **Up-to-date screenshots** - Update UI documentation
- **Version compatibility** - Note breaking changes

## 🔧 Development Setup

### Prerequisites
```bash
# Required versions
Node.js 18+
npm 9+
SQLite (for development)
Redis (optional, mocked in tests)
```

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd checklist_app

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Run tests
npm run test:unit
```

### Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ... code changes ...

# 3. Run quality checks
npm run pre-commit

# 4. Commit changes
git add .
git commit -m "feat(scope): description"

# 5. Push and create PR
git push origin feature/my-feature
```

## 🧪 Testing Requirements

### Test Coverage
- **New features** require tests
- **Bug fixes** require regression tests
- **API changes** require integration tests
- **Business logic** requires unit tests

### Test Quality
- Tests must be deterministic
- Mock external dependencies
- Use descriptive test names
- Follow Arrange-Act-Assert pattern

### Running Tests
```bash
# All tests
npm run test

# Specific test types
npm run test:unit
npm run test:api
npm run test:e2e

# With coverage
npm run test:coverage
```

## 🏗️ Architecture Guidelines

### Code Organization
```
src/
├── app/           # Next.js app router
├── components/    # Reusable UI components
├── lib/           # Business logic and utilities
└── types/         # TypeScript type definitions
```

### Key Principles
- **Agents-first architecture** - Core functionality around agents
- **Self-healing workflows** - Metadata + LLM intent repair
- **Secure credential management** - Encrypted login storage
- **Two-stage execution** - Primary automation + LLM fallback

### Technology Stack
- **Frontend**: Next.js 15 + React 19 + Inline CSS
- **Backend**: Next.js API routes
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Queue**: Redis + BullMQ
- **Testing**: Jest + Testing Library
- **Authentication**: NextAuth.js

## 🔒 Security Guidelines

### Credential Handling
- Never log sensitive data
- Use environment variables for secrets
- Encrypt stored credentials
- Validate all inputs

### API Security
- Implement proper authentication
- Validate request parameters
- Use HTTPS in production
- Implement rate limiting

### Database Security
- Use parameterized queries
- Validate all inputs
- Implement proper access controls
- Regular security audits

## 📋 Code Review Guidelines

### For Authors
- Keep PRs small and focused
- Write clear commit messages
- Include tests for new features
- Update documentation
- Respond to review feedback

### For Reviewers
- Check code quality and standards
- Verify tests are adequate
- Ensure documentation is updated
- Test functionality manually
- Provide constructive feedback

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance implications considered
- [ ] Breaking changes documented

## 🚀 Release Process

### Version Numbering
Follow Semantic Versioning (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps
1. **Update version** in package.json
2. **Update CHANGELOG.md** with changes
3. **Create release branch** from main
4. **Run full test suite**
5. **Deploy to staging** for final testing
6. **Deploy to production**
7. **Create GitHub release**

## 🐛 Bug Reports

### Bug Report Template
```markdown
**Bug Description**
Brief description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen

**Actual Behavior**
What actually happened

**Environment**
- OS: [e.g. macOS 14]
- Browser: [e.g. Chrome 120]
- Node.js version: [e.g. 18.17]

**Additional Context**
Any other context about the problem
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Feature Description**
Brief description of the feature

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should this work?

**Alternatives Considered**
What other approaches were considered?

**Additional Context**
Any other context or screenshots
```

## 📞 Getting Help

### Communication Channels
- **GitHub Issues** - Bug reports and feature requests
- **Pull Requests** - Code discussions
- **Documentation** - Check existing docs first

### Response Times
- **Critical bugs**: 24 hours
- **Feature requests**: 1 week
- **General questions**: 3 days

---

**Remember**: Good contributions start with understanding the codebase and following established patterns. When in doubt, ask questions and seek feedback early.
