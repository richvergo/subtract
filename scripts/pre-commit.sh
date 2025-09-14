#!/bin/bash

# Pre-commit hook to enforce quality standards
# This script prevents the exact issues we just fixed from happening again

echo "🚀 Running pre-commit quality checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# 1. Check for snake_case database fields
echo "📊 Checking for snake_case database fields..."
if grep -r "agent_config\|purpose_prompt\|agent_intents" tests/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "❌ Found snake_case database fields! Use camelCase instead."
    echo "Run these commands to fix:"
    echo "  find . -name '*.ts' -o -name '*.tsx' | xargs sed -i '' 's/agent_config/agentConfig/g'"
    echo "  find . -name '*.ts' -o -name '*.tsx' | xargs sed -i '' 's/purpose_prompt/purposePrompt/g'"
    echo "  find . -name '*.ts' -o -name '*.tsx' | xargs sed -i '' 's/agent_intents/agentIntents/g'"
    exit 1
else
    echo "✅ No snake_case database fields found"
fi

# 2. Check for 'any' types
echo "🔍 Checking for 'any' type usage..."
if grep -r ": any" src/ --include="*.ts" --include="*.tsx" --exclude-dir=node_modules 2>/dev/null; then
    echo "❌ Found 'any' types! Use proper types instead."
    echo "Replace 'any' with 'unknown' or specific interfaces"
    exit 1
else
    echo "✅ No 'any' types found"
fi

# 3. Check for unescaped JSX entities
echo "⚛️  Checking for unescaped JSX entities..."
if grep -r "Don't\|can't\|won't" src/ --include="*.tsx" --exclude-dir=node_modules 2>/dev/null; then
    echo "❌ Found unescaped JSX entities! Use &apos; instead of '"
    echo "Example: Don't → Don&apos;t"
    exit 1
else
    echo "✅ No unescaped JSX entities found"
fi

# 4. Run TypeScript type check
echo "🔧 Running TypeScript type check..."
if ! npm run type-check; then
    echo "❌ TypeScript type check failed"
    exit 1
else
    echo "✅ TypeScript type check passed"
fi

# 5. Run ESLint
echo "📝 Running ESLint..."
if ! npm run lint; then
    echo "❌ ESLint check failed"
    echo "Run 'npm run lint:fix' to auto-fix issues"
    exit 1
else
    echo "✅ ESLint check passed"
fi

# 6. Run unit tests
echo "🧪 Running unit tests..."
if ! npm run test:unit; then
    echo "❌ Unit tests failed"
    exit 1
else
    echo "✅ Unit tests passed"
fi

# 7. Check build
echo "🏗️  Checking build..."
if ! npm run build; then
    echo "❌ Build failed"
    exit 1
else
    echo "✅ Build successful"
fi

echo "🎉 All pre-commit checks passed! Ready to commit."
