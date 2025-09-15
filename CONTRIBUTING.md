# Contributing Guide

This guide outlines how to contribute to the vergo automation platform effectively and maintain code quality.

## 🌿 Branching Model

### Branch Structure
```
main (production)
├── develop (integration)
├── backend/backend-feature
├── frontend/frontend-feature
├── bugfix/bug-description
└── hotfix/critical-fix
```

### Branch Naming Conventions

#### 🚫 Backend Protection
- **Backend features**: `backend/fix-agent-execution`
- **Backend bugfixes**: `backend/add-login-validation`
- **Database changes**: `backend/update-agent-schema`

#### 🎨 Frontend Work
- **Frontend features**: `frontend/improve-agent-ui`
- **Frontend bugfixes**: `frontend/fix-dashboard-layout`
- **UI/UX changes**: `frontend/add-dashboard-charts`

#### 🔧 General Work
- **Bugfixes**: `bugfix/fix-login-validation`
- **Hotfixes**: `hotfix/security-patch`
- **Chores**: `chore/update-dependencies`

### Backend Lock Policy

**🚫 BACKEND IS FROZEN** - Backend files are protected for stability.

#### Protected Files
- `src/app/api/**/route.ts` - All API routes
- `src/lib/db.ts` - Database layer
- `src/lib/queue.ts` - Queue system
- `prisma/schema.prisma` - Database schema

#### Rules
- **Backend changes** must be in `backend/*` branches only
- **CI will fail** if backend files are modified in non-backend branches
- **Frontend work** should use `frontend/*` branches
- **AI prompts** must state "do not modify backend files"

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
- Backend file protection enforced via CI
- No merge allowed with failing checks

### GitHub Branch Protection Rules

#### Required Settings
1. **Enable branch protection** on `main` and `develop` branches
2. **Require status checks** to pass before merging
3. **Require branches to be up to date** before merging
4. **Dismiss stale reviews** when new commits are pushed

#### CI Checks Required
- ✅ **Protect Backend Files** - Ensures backend files aren't modified in wrong branches
- ✅ **Quality Checks** - Lint, type-check, and tests
- ✅ **Build Check** - Application builds successfully

#### Branch Protection Configuration
```yaml
# GitHub Settings > Branches > Add Rule
Branch name pattern: main
☑️ Require a pull request before merging
☑️ Require status checks to pass before merging
  ☑️ protect-backend.yml
  ☑️ quality-checks.yml
☑️ Require branches to be up to date before merging
☑️ Dismiss stale reviews when new commits are pushed
```

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
