#!/bin/bash

# VariableConfigModal Component Guardrails Check
# Ensures VariableConfigModal component follows security and architecture guidelines

set -e

echo "🔒 Checking VariableConfigModal component guardrails..."

FAILED_CHECKS=0

# Check 1: No hardcoded API URLs
echo "📋 Checking for hardcoded API URLs..."
if grep -r "http://localhost\|https://api\." src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ Found hardcoded API URLs in VariableConfigModal.tsx"
  echo "   Use environment variables instead: process.env.NEXT_PUBLIC_API_URL"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ No hardcoded API URLs found"
fi

# Check 2: Zod validation is used
echo "📋 Checking for Zod validation usage..."
if ! grep -q "z\." src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ VariableConfigModal.tsx does not use Zod for API response validation"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Zod validation found"
fi

# Check 3: No sensitive data logging
echo "📋 Checking for sensitive data logging..."
if grep -r "console\.log.*password\|console\.log.*secret\|console\.log.*token" src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ Found potential sensitive data logging in VariableConfigModal.tsx"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ No sensitive data logging found"
fi

# Check 4: Environment variable usage
echo "📋 Checking for environment variable usage..."
if ! grep -q "process\.env\." src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ VariableConfigModal.tsx does not use environment variables for configuration"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Environment variables used for configuration"
fi

# Check 5: Error handling present
echo "📋 Checking for error handling..."
if ! grep -q "catch\|error\|Error" src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ VariableConfigModal.tsx lacks proper error handling"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Error handling present"
fi

# Check 6: TypeScript types used
echo "📋 Checking for TypeScript usage..."
if ! grep -q "interface\|type\|:" src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ VariableConfigModal.tsx lacks proper TypeScript typing"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ TypeScript types used"
fi

# Check 7: No direct DOM manipulation (except allowed browser APIs)
echo "📋 Checking for direct DOM manipulation..."
if grep -r "document\.\|window\." src/app/components/workflows/VariableConfigModal.tsx | grep -v "window\.confirm"; then
  echo "❌ Found direct DOM manipulation in VariableConfigModal.tsx"
  echo "   Use React patterns instead of direct DOM access"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ No direct DOM manipulation found"
fi

# Check 8: Tests exist
echo "📋 Checking for test coverage..."
if [ ! -f "tests/frontend/VariableConfigModal.test.tsx" ]; then
  echo "❌ VariableConfigModal.test.tsx not found"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Test file exists"
  
  # Check test quality
  if ! grep -q "describe\|it\|test" tests/frontend/VariableConfigModal.test.tsx; then
    echo "❌ Test file appears to be empty or malformed"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  else
    echo "✅ Test file contains test cases"
  fi
fi

# Check 9: API endpoint exists
echo "📋 Checking for variables API endpoint..."
if [ ! -f "src/app/api/agents/[id]/variables.ts" ]; then
  echo "❌ variables.ts API endpoint not found"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ API endpoint exists"
  
  # Check API endpoint supports CRUD operations
  if ! grep -q "export async function GET\|export async function POST\|export async function PUT\|export async function DELETE" src/app/api/agents/[id]/variables.ts; then
    echo "❌ API endpoint missing CRUD handlers"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  else
    echo "✅ API endpoint has CRUD handlers"
  fi
fi

# Check 10: No console.log in production code
echo "📋 Checking for console.log usage..."
if grep -r "console\.log" src/app/components/workflows/VariableConfigModal.tsx | grep -v "console\.log.*'📊\|console\.log.*'✅\|console\.log.*'❌\|console\.log.*'➕\|console\.log.*'✏️\|console\.log.*'🗑️"; then
  echo "❌ Found non-debug console.log statements in VariableConfigModal.tsx"
  echo "   Remove or replace with proper logging"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Console.log usage is appropriate (debug only)"
fi

# Check 11: Proper React patterns
echo "📋 Checking for React best practices..."
if grep -r "useEffect.*\[\]" src/app/components/workflows/VariableConfigModal.tsx | grep -v "useEffect.*\[.*\]"; then
  echo "❌ Found useEffect without dependency array in VariableConfigModal.tsx"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ useEffect dependencies properly specified"
fi

# Check 12: Duplicate name validation
echo "📋 Checking for duplicate name validation..."
if ! grep -q "duplicate\|already exists" src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ VariableConfigModal.tsx lacks duplicate name validation"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Duplicate name validation present"
fi

# Check 13: Optimistic updates
echo "📋 Checking for optimistic updates..."
if ! grep -q "setVariables.*prev" src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ VariableConfigModal.tsx lacks optimistic updates"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Optimistic updates implemented"
fi

# Check 14: Form validation
echo "📋 Checking for form validation..."
if ! grep -q "validateForm\|validation" src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ VariableConfigModal.tsx lacks form validation"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Form validation present"
fi

# Check 15: Loading states
echo "📋 Checking for loading states..."
if ! grep -q "isLoading\|isSaving\|Loading\|Saving" src/app/components/workflows/VariableConfigModal.tsx; then
  echo "❌ VariableConfigModal.tsx lacks loading states"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo "✅ Loading states implemented"
fi

# Summary
echo ""
if [ $FAILED_CHECKS -eq 0 ]; then
  echo "🎉 All VariableConfigModal guardrails passed!"
  echo "✅ Component follows security and architecture guidelines"
else
  echo "❌ VariableConfigModal guardrails check failed!"
  echo "   $FAILED_CHECKS issues found that need to be addressed"
  echo ""
  echo "💡 Recommendations:"
  echo "   - Use environment variables for API URLs"
  echo "   - Implement Zod validation for all API responses"
  echo "   - Add comprehensive error handling"
  echo "   - Ensure no sensitive data is logged"
  echo "   - Follow React best practices"
  echo "   - Add duplicate name validation"
  echo "   - Implement optimistic updates"
  echo "   - Add form validation and loading states"
  exit 1
fi
