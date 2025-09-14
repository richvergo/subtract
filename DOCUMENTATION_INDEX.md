# Documentation Index

This is your starting point for understanding and contributing to the vergo automation platform.

## 🚀 Quick Start

### For New Developers
1. **Start here**: [README.md](./README.md) - Project overview and setup
2. **Read this**: [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) - Essential coding standards
3. **Understand this**: [ARCHITECTURE.md](./ARCHITECTURE.md) - How the system works
4. **Test like this**: [TESTING.md](./TESTING.md) - Testing strategies

### For Contributors
1. **Follow this**: [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
2. **Use this**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common commands and fixes
3. **Check this**: [PRE_COMMIT_SUMMARY.md](./PRE_COMMIT_SUMMARY.md) - Quality improvements made

## 📚 Documentation Structure

### 🏗️ Architecture & Design
| Document | Purpose | Audience |
|----------|---------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and technical decisions | Developers, Architects |
| [README.md](./README.md) | Project overview and setup | Everyone |

### 💻 Development Standards
| Document | Purpose | Audience |
|----------|---------|----------|
| [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) | Coding standards and guard rails | All Developers |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute effectively | Contributors |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Common fixes and commands | All Developers |

### 🧪 Testing & Quality
| Document | Purpose | Audience |
|----------|---------|----------|
| [TESTING.md](./TESTING.md) | Testing strategies and best practices | Developers, QA |
| [PRE_COMMIT_SUMMARY.md](./PRE_COMMIT_SUMMARY.md) | Quality improvements summary | All Team Members |

### 📋 Project Management
| Document | Purpose | Audience |
|----------|---------|----------|
| [PRD.md](./PRD.md) | Product requirements document | Product, Engineering |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | High-level project overview | Stakeholders |

## 🔍 Finding What You Need

### I want to...
- **Understand the system** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Set up development** → [README.md](./README.md) + [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)
- **Fix a bug** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) + [TESTING.md](./TESTING.md)
- **Add a feature** → [CONTRIBUTING.md](./CONTRIBUTING.md) + [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Write tests** → [TESTING.md](./TESTING.md)
- **Review code** → [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)
- **Deploy changes** → [CONTRIBUTING.md](./CONTRIBUTING.md)

### Common Issues
- **Build fails** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Build Issues section
- **Tests fail** → [TESTING.md](./TESTING.md) - Debugging Tests section
- **Type errors** → [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) - TypeScript section
- **Schema issues** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Schema Fixes section

## 🚨 Critical Guard Rails

These documents prevent common errors:

### Database Schema
- **Rule**: Always use camelCase (`agentConfig`, not `agent_config`)
- **Check**: [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) - Database Schema section
- **Fix**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Schema Fixes section

### TypeScript Types
- **Rule**: Never use `any` type
- **Check**: [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) - TypeScript section
- **Fix**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - TypeScript Fixes section

### React JSX
- **Rule**: Escape entities (`Don&apos;t` not `Don't`)
- **Check**: [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) - React section
- **Fix**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - JSX Fixes section

## 🔧 Essential Commands

### Daily Development
```bash
# Before starting work
npm run schema-check    # Ensure schema is up to date
npm run type-check      # Check for TypeScript errors
npm run lint            # Check code quality

# Before committing
npm run pre-commit      # Run all quality checks

# After schema changes
npx prisma generate     # Regenerate Prisma client
npm run test:unit       # Run unit tests
```

### Quality Assurance
```bash
# Run all tests
npm run test

# Run specific test types
npm run test:unit       # Unit tests
npm run test:api        # API tests
npm run test:e2e        # End-to-end tests

# Build verification
npm run build
```

## 📈 Documentation Maintenance

### Keeping Docs Updated
- **Code changes** → Update relevant documentation
- **New features** → Update [ARCHITECTURE.md](./ARCHITECTURE.md) and [TESTING.md](./TESTING.md)
- **Process changes** → Update [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Bug fixes** → Update [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) if needed

### Documentation Standards
- **Clear examples** - Provide working code samples
- **Up-to-date** - Keep docs in sync with code
- **Comprehensive** - Cover all important aspects
- **Accessible** - Use clear language and structure

## 🎯 Success Metrics

### Documentation Quality
- ✅ **Comprehensive coverage** - All major topics documented
- ✅ **Clear examples** - Working code samples provided
- ✅ **Up-to-date** - Docs match current codebase
- ✅ **Accessible** - Easy to find and understand

### Developer Experience
- ✅ **Quick onboarding** - New developers can get started quickly
- ✅ **Self-service** - Developers can find answers independently
- ✅ **Consistent quality** - Guard rails prevent common errors
- ✅ **Efficient workflow** - Clear processes and commands

---

**Remember**: Good documentation is a living resource. Keep it updated, clear, and comprehensive to ensure team success.
