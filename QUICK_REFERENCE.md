# Quick Reference - Common Fixes & Commands

## 🚨 Critical Issues We Fixed

### Database Schema Issues
- **Problem**: Test files using `agent_config`, `purpose_prompt` (snake_case)
- **Solution**: Use `agentConfig`, `purposePrompt` (camelCase)
- **Command**: `grep -r "agent_config\|purpose_prompt" tests/ src/`

### TypeScript `any` Types
- **Problem**: Using `any` instead of proper types
- **Solution**: Replace with `unknown` or specific interfaces
- **Command**: `npx tsc --noEmit` to find type errors

### Missing Exports
- **Problem**: Functions not exported from modules
- **Solution**: Add `export` keyword to function declarations
- **Check**: Import errors in build

### Unescaped JSX Entities
- **Problem**: `Don't`, `"quotes"` in JSX
- **Solution**: `Don&apos;t`, `&quot;quotes&quot;`
- **Command**: `npm run lint` to find issues

## 🔧 Essential Commands

```bash
# Before starting work
npm run schema-check    # Ensure schema is up to date
npm run type-check      # Check for TypeScript errors
npm run lint            # Check code quality

# Before committing
npm run pre-commit      # Run all checks (lint + type-check + tests)
npm run build           # Ensure build succeeds

# After schema changes
npx prisma generate     # Regenerate Prisma client
npm run test:unit       # Run unit tests
```

## 🛠️ Quick Fixes

### Fix All Schema Issues
```bash
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/agent_config/agentConfig/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/purpose_prompt/purposePrompt/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/agent_intents/agentIntents/g'
```

### Fix Linting Issues
```bash
npm run lint:fix        # Auto-fix linting issues
```

### Clean Build
```bash
rm -rf .next            # Clean Next.js cache
npm run build           # Fresh build
```

## 📋 Pre-Commit Checklist

- [ ] `npm run schema-check` passes
- [ ] `npm run type-check` passes  
- [ ] `npm run lint` passes
- [ ] `npm run test:unit` passes
- [ ] `npm run build` succeeds
- [ ] No `any` types in new code
- [ ] All database fields use camelCase
- [ ] All JSX entities escaped
- [ ] All functions properly exported

## 🚨 Red Flags to Watch For

1. **Build fails with import errors** → Missing exports
2. **TypeScript errors about unknown fields** → Schema mismatch
3. **ESLint errors about `any`** → Use proper types
4. **ESLint errors about unescaped entities** → Escape JSX
5. **Tests fail with database errors** → Schema field names

---

**Remember**: These are the exact issues we just fixed. Use this as a checklist to prevent them from happening again.
