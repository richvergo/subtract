# Development Guidelines & Guard Rails

This document establishes coding standards and guard rails to prevent common errors and maintain code quality.

## 🚨 Critical Guard Rails

### 1. Database Schema Consistency
**NEVER** use snake_case in Prisma schema or database operations. Always use camelCase.

```typescript
// ✅ CORRECT - Use camelCase
agentConfig: JSON.stringify(config)
purposePrompt: "Agent purpose"
agentIntents: JSON.stringify(intents)

// ❌ WRONG - Never use snake_case
agent_config: JSON.stringify(config)
purpose_prompt: "Agent purpose"
agent_intents: JSON.stringify(intents)
```

**Checklist before commit:**
- [ ] All database fields use camelCase
- [ ] All test files match schema field names
- [ ] Run `npx prisma generate` after schema changes
- [ ] Run `npx tsc --noEmit` to check for type errors

### 2. TypeScript Type Safety
**NEVER** use `any` type. Always use proper types.

```typescript
// ✅ CORRECT - Use proper types
function processData(data: unknown): ProcessedData
function handleError(error: Error): void
interface AgentConfig { steps: ActionStep[] }

// ❌ WRONG - Never use any
function processData(data: any): any
function handleError(error: any): void
```

**Checklist before commit:**
- [ ] No `any` types in new code
- [ ] Replace existing `any` with `unknown` or proper interfaces
- [ ] All function parameters have explicit types
- [ ] All return types are explicit

### 3. React JSX Entity Escaping
**ALWAYS** escape special characters in JSX.

```typescript
// ✅ CORRECT - Escaped entities
<p>Don&apos;t forget to click &quot;Submit&quot;</p>
<p>This &amp; that are important</p>

// ❌ WRONG - Unescaped entities
<p>Don't forget to click "Submit"</p>
<p>This & that are important</p>
```

### 4. Export/Import Consistency
**ALWAYS** ensure functions are properly exported and imported.

```typescript
// ✅ CORRECT - Proper exports
export async function enqueueAgentRun(agentId: string, params: unknown) {
  // implementation
}

// ✅ CORRECT - Proper imports
import { enqueueAgentRun } from '@/lib/queue'
```

## 🔧 Automated Checks

### Pre-commit Hooks
Add these scripts to `package.json`:

```json
{
  "scripts": {
    "pre-commit": "npm run lint && npm run type-check && npm run test:unit",
    "type-check": "tsc --noEmit",
    "lint:fix": "eslint . --fix --ext .ts,.tsx",
    "schema-check": "npx prisma generate && npx tsc --noEmit"
  }
}
```

### ESLint Configuration
Ensure these rules are enabled in `eslint.config.mjs`:

```javascript
{
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "react/no-unescaped-entities": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

## 📋 Code Review Checklist

Before merging any PR, verify:

### Database & Schema
- [ ] All database operations use camelCase field names
- [ ] Test files match current schema
- [ ] Prisma client regenerated after schema changes
- [ ] No TypeScript errors related to database types

### TypeScript & Types
- [ ] No `any` types used
- [ ] All function parameters have explicit types
- [ ] All return types are explicit
- [ ] TypeScript compilation passes (`tsc --noEmit`)

### React & JSX
- [ ] All special characters properly escaped
- [ ] No unescaped quotes or apostrophes
- [ ] Proper TypeScript interfaces for props

### Imports & Exports
- [ ] All functions properly exported
- [ ] All imports resolve correctly
- [ ] No unused imports or variables

### Testing
- [ ] Unit tests pass
- [ ] API tests pass
- [ ] No test database schema mismatches

## 🚀 Development Workflow

### Before Starting Work
1. Run `npm run schema-check` to ensure schema is up to date
2. Run `npm run type-check` to verify no type errors
3. Run `npm run lint` to check for code quality issues

### During Development
1. Use proper TypeScript types from the start
2. Follow camelCase convention for database fields
3. Escape JSX entities immediately
4. Export functions as you create them

### Before Committing
1. Run `npm run pre-commit` (includes lint, type-check, and tests)
2. Fix any linting errors
3. Ensure all tests pass
4. Verify build succeeds (`npm run build`)

### After Schema Changes
1. Run `npx prisma generate`
2. Update all test files to match new schema
3. Run `npm run type-check`
4. Run `npm run test:unit`

## 🛠️ Common Fixes

### Fixing Schema Mismatches
```bash
# Find all snake_case usage
grep -r "agent_config\|purpose_prompt\|agent_intents" tests/ src/

# Replace with camelCase
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/agent_config/agentConfig/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/purpose_prompt/purposePrompt/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/agent_intents/agentIntents/g'
```

### Fixing TypeScript Errors
```bash
# Check for type errors
npx tsc --noEmit

# Fix linting issues
npm run lint:fix
```

### Fixing Build Issues
```bash
# Clean and rebuild
rm -rf .next
npm run build
```

## 📚 Resources

- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [React JSX Entity Escaping](https://reactjs.org/docs/introducing-jsx.html#jsx-prevents-injection-attacks)
- [Prisma Schema Conventions](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [ESLint Rules](https://eslint.org/docs/rules/)

---

**Remember:** These guard rails exist to prevent the exact issues we just fixed. Follow them religiously to maintain code quality and prevent regression.
