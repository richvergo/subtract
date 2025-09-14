#!/usr/bin/env node

/**
 * Test Login Health Check
 * Tests the login health check functionality
 */

const { PrismaClient } = require('@prisma/client');
const { LoginHealthChecker } = require('./src/lib/login-health-checker');

const prisma = new PrismaClient();

async function testLoginHealth() {
  console.log('🔍 Testing Login Health Check System...');
  
  try {
    // Find the Google Slides login
    const login = await prisma.login.findFirst({
      where: { name: 'Google Slides' },
      include: { owner: true }
    });

    if (!login) {
      console.log('❌ Google Slides login not found');
      return;
    }

    console.log('✅ Found Google Slides login:');
    console.log(`   Name: ${login.name}`);
    console.log(`   Owner: ${login.owner.email}`);
    console.log(`   Current Status: ${login.status}`);
    console.log(`   Last Checked: ${login.lastCheckedAt || 'Never'}`);
    console.log(`   Failure Count: ${login.failureCount}`);

    // Test health check
    console.log('\n🚀 Running health check...');
    const healthChecker = new LoginHealthChecker();
    const result = await healthChecker.checkLoginHealth(login.id);
    await healthChecker.close();

    console.log('\n📊 Health Check Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    console.log(`   Last Checked: ${result.lastChecked}`);
    if (result.errorMessage) {
      console.log(`   Error: ${result.errorMessage}`);
    }

    // Check updated status in database
    const updatedLogin = await prisma.login.findUnique({
      where: { id: login.id }
    });

    console.log('\n📈 Updated Login Status:');
    console.log(`   Status: ${updatedLogin.status}`);
    console.log(`   Last Checked: ${updatedLogin.lastCheckedAt}`);
    console.log(`   Last Success: ${updatedLogin.lastSuccessAt || 'Never'}`);
    console.log(`   Last Failure: ${updatedLogin.lastFailureAt || 'Never'}`);
    console.log(`   Failure Count: ${updatedLogin.failureCount}`);
    if (updatedLogin.errorMessage) {
      console.log(`   Error Message: ${updatedLogin.errorMessage}`);
    }

    console.log('\n✅ Login health check test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLoginHealth();
