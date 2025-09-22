#!/bin/bash

# 🛡️ LOGINS FEATURE PROTECTION HOOK
# This script runs before every commit to ensure the logins feature remains stable

echo "🛡️ Running Logins Feature Protection Checks..."

# Check if login-related files are modified
if git diff --cached --name-only | grep -E "(logins|Login)" > /dev/null; then
    echo "🔍 Login files modified - running protection checks..."
    
    # 1. Check for critical state variables
    echo "📋 Checking critical state variables..."
    
    LOGINS_PAGE="src/app/logins/page.tsx"
    
    if [ ! -f "$LOGINS_PAGE" ]; then
        echo "❌ CRITICAL: $LOGINS_PAGE not found!"
        exit 1
    fi
    
    # Check for critical state variables
    if ! grep -q "setHasRecording" "$LOGINS_PAGE"; then
        echo "❌ CRITICAL: setHasRecording state variable missing!"
        echo "   This will cause 'setHasRecording is not defined' error"
        exit 1
    fi
    
    if ! grep -q "setRecordingBlob" "$LOGINS_PAGE"; then
        echo "❌ CRITICAL: setRecordingBlob state variable missing!"
        exit 1
    fi
    
    if ! grep -q "setRecordingError" "$LOGINS_PAGE"; then
        echo "❌ CRITICAL: setRecordingError state variable missing!"
        exit 1
    fi
    
    if ! grep -q "setIsRecording" "$LOGINS_PAGE"; then
        echo "❌ CRITICAL: setIsRecording state variable missing!"
        exit 1
    fi
    
    if ! grep -q "setAnalysisStatus" "$LOGINS_PAGE"; then
        echo "❌ CRITICAL: setAnalysisStatus state variable missing!"
        exit 1
    fi
    
    echo "✅ All critical state variables present"
    
    # 2. Check for API endpoints
    echo "🌐 Checking API endpoints..."
    
    API_ENDPOINTS=(
        "src/app/api/logins/route.ts"
        "src/app/api/logins/[id]/route.ts"
        "src/app/api/logins/[id]/check/route.ts"
        "src/app/api/logins/[id]/test-interactive/route.ts"
        "src/app/api/logins/[id]/credentials/route.ts"
    )
    
    for endpoint in "${API_ENDPOINTS[@]}"; do
        if [ ! -f "$endpoint" ]; then
            echo "❌ CRITICAL: API endpoint $endpoint missing!"
            exit 1
        fi
    done
    
    echo "✅ All API endpoints present"
    
    # 3. Check database schema
    echo "🗄️ Checking database schema..."
    
    if ! grep -q "model Login" prisma/schema.prisma; then
        echo "❌ CRITICAL: Login model missing from schema!"
        exit 1
    fi
    
    if ! grep -q "enum LoginStatus" prisma/schema.prisma; then
        echo "❌ CRITICAL: LoginStatus enum missing from schema!"
        exit 1
    fi
    
    echo "✅ Database schema intact"
    
    # 4. Run tests
    echo "🧪 Running login protection tests..."
    
    if ! npm run test -- --testPathPatterns=test_logins_protection --passWithNoTests > /dev/null 2>&1; then
        echo "❌ CRITICAL: Login protection tests failed!"
        echo "   Run 'npm run test -- --testPathPatterns=test_logins_protection' for details"
        exit 1
    fi
    
    echo "✅ Login protection tests passed"
    
    # 5. TypeScript check
    echo "📝 Running TypeScript check..."
    
    if ! npx tsc --noEmit > /dev/null 2>&1; then
        echo "❌ CRITICAL: TypeScript compilation errors found!"
        echo "   Run 'npx tsc --noEmit' for details"
        exit 1
    fi
    
    echo "✅ TypeScript check passed"
    
    echo "🎉 All login protection checks passed!"
    echo "✅ Safe to commit changes to login feature"
    
else
    echo "ℹ️ No login files modified - skipping protection checks"
fi

echo "🛡️ Login protection hook completed successfully"
exit 0
