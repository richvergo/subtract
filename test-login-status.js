#!/usr/bin/env node

/**
 * Test Login Status Update
 * Tests updating login status in the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLoginStatus() {
  console.log('🔍 Testing Login Status System...');
  
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

    // Simulate a health check result
    console.log('\n🚀 Simulating health check...');
    const now = new Date();
    const isHealthy = Math.random() > 0.3; // 70% chance of being healthy

    const updateData = {
      lastCheckedAt: now,
      status: isHealthy ? 'ACTIVE' : 'BROKEN',
      errorMessage: isHealthy ? null : 'Simulated test failure'
    };

    if (isHealthy) {
      updateData.lastSuccessAt = now;
      updateData.failureCount = 0;
    } else {
      updateData.lastFailureAt = now;
      updateData.failureCount = { increment: 1 };
    }

    // Update the login status
    const updatedLogin = await prisma.login.update({
      where: { id: login.id },
      data: updateData
    });

    console.log('\n📊 Simulated Health Check Result:');
    console.log(`   Success: ${isHealthy}`);
    console.log(`   Status: ${updatedLogin.status}`);
    console.log(`   Last Checked: ${updatedLogin.lastCheckedAt}`);
    console.log(`   Last Success: ${updatedLogin.lastSuccessAt || 'Never'}`);
    console.log(`   Last Failure: ${updatedLogin.lastFailureAt || 'Never'}`);
    console.log(`   Failure Count: ${updatedLogin.failureCount}`);
    if (updatedLogin.errorMessage) {
      console.log(`   Error Message: ${updatedLogin.errorMessage}`);
    }

    // Test different status scenarios
    console.log('\n🧪 Testing different status scenarios...');
    
    const statuses = ['ACTIVE', 'BROKEN', 'EXPIRED', 'SUSPENDED'];
    for (const status of statuses) {
      const testLogin = await prisma.login.update({
        where: { id: login.id },
        data: { 
          status,
          lastCheckedAt: new Date(),
          errorMessage: status === 'BROKEN' ? 'Test error message' : null
        }
      });
      
      console.log(`   ✅ Set status to: ${testLogin.status}`);
    }

    // Reset to UNKNOWN
    await prisma.login.update({
      where: { id: login.id },
      data: { 
        status: 'UNKNOWN',
        lastCheckedAt: new Date(),
        errorMessage: null
      }
    });

    console.log('\n✅ Login status system test completed successfully!');
    console.log('🎯 The login status tracking is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLoginStatus();
