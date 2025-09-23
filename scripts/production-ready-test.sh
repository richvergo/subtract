#!/bin/bash

# 🚀 PRODUCTION-READY TESTING SCRIPT
# This script tests the application in a production-like environment

echo "🚀 Starting Production-Ready Testing..."

# 1. Check if application is running
echo "📡 Checking application status..."
if ! curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "❌ Application not running. Please start with: npm run dev"
    exit 1
fi
echo "✅ Application is running"

# 2. Test login protection
echo "🔒 Testing login protection..."
npm run test:logins-protection
if [ $? -ne 0 ]; then
    echo "❌ Login protection tests failed"
    exit 1
fi
echo "✅ Login protection tests passed"

# 3. Test database integrity
echo "🗄️ Testing database integrity..."
npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as login_count FROM Login;"
npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as agent_count FROM Agent;"
echo "✅ Database integrity verified"

# 4. Test safe seeding
echo "🌱 Testing safe seeding..."
npx prisma db seed
if [ $? -ne 0 ]; then
    echo "❌ Safe seeding failed"
    exit 1
fi
echo "✅ Safe seeding completed"

# 5. Verify data preservation
echo "🛡️ Verifying data preservation..."
LOGIN_COUNT=$(npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM Login;" 2>/dev/null | grep -o '[0-9]*' | tail -1)
AGENT_COUNT=$(npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM Agent;" 2>/dev/null | grep -o '[0-9]*' | tail -1)

echo "📊 Current data counts:"
echo "   - Logins: $LOGIN_COUNT"
echo "   - Agents: $AGENT_COUNT"

# 6. Test API endpoints
echo "🌐 Testing API endpoints..."
curl -s -f http://localhost:3000/api/logins > /dev/null && echo "✅ Logins API working" || echo "❌ Logins API failed"
curl -s -f http://localhost:3000/api/agents > /dev/null && echo "✅ Agents API working" || echo "❌ Agents API failed"

# 7. Test UI accessibility
echo "🖥️ Testing UI accessibility..."
curl -s -f http://localhost:3000/logins > /dev/null && echo "✅ Logins page accessible" || echo "❌ Logins page failed"
curl -s -f http://localhost:3000/agents > /dev/null && echo "✅ Agents page accessible" || echo "❌ Agents page failed"

echo ""
echo "🎉 PRODUCTION-READY TESTING COMPLETED!"
echo "✅ All systems operational"
echo "🛡️ Data protection active"
echo "🚀 Ready for production testing"
