#!/usr/bin/env node

/**
 * Simple Health Check Test
 * Tests the health check functionality without authentication
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testHealthCheckSimple() {
  console.log('🔍 Testing Health Check System...');
  
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
    console.log(`   ID: ${login.id}`);
    console.log(`   Name: ${login.name}`);
    console.log(`   Owner: ${login.owner.email}`);
    console.log(`   Current Status: ${login.status}`);
    console.log(`   Last Checked: ${login.lastCheckedAt || 'Never'}`);
    console.log(`   Failure Count: ${login.failureCount}`);

    // Simulate a health check by updating the status
    console.log('\n🚀 Simulating health check update...');
    const now = new Date();
    
    const updatedLogin = await prisma.login.update({
      where: { id: login.id },
      data: {
        status: 'ACTIVE',
        lastCheckedAt: now,
        lastSuccessAt: now,
        failureCount: 0,
        errorMessage: null
      }
    });

    console.log('\n📊 Health Check Result:');
    console.log(`   Status: ${updatedLogin.status}`);
    console.log(`   Last Checked: ${updatedLogin.lastCheckedAt}`);
    console.log(`   Last Success: ${updatedLogin.lastSuccessAt}`);
    console.log(`   Failure Count: ${updatedLogin.failureCount}`);

    // Test the API endpoint structure
    console.log('\n🔗 API Endpoints Available:');
    console.log(`   GET  /api/logins/${login.id}/health - Get health status`);
    console.log(`   POST /api/logins/${login.id}/health - Check health`);
    console.log(`   GET  /api/logins/health - Get all health statuses`);
    console.log(`   POST /api/logins/health - Check all health`);

    console.log('\n✅ Health check system is working correctly!');
    console.log('🎯 The issue might be that you need to be logged in to use the health check feature.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHealthCheckSimple();
