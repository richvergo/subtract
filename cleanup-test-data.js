#!/usr/bin/env node

/**
 * Safe Test Data Cleanup Script
 * Removes only the test data I created, preserving user's real data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data while preserving your real data...');

  try {
    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (!testUser) {
      console.log('❌ Test user not found - no test data to clean up');
      return;
    }

    console.log(`✅ Found test user: ${testUser.name} (${testUser.email})`);

    // Get all data for the test user
    const testLogins = await prisma.login.findMany({
      where: { ownerId: testUser.id }
    });

    const testAgents = await prisma.agent.findMany({
      where: { ownerId: testUser.id },
      include: {
        agentLogins: true,
        agentRuns: true
      }
    });

    console.log(`\n📊 Test data found:`);
    console.log(`  - Logins: ${testLogins.length}`);
    console.log(`  - Agents: ${testAgents.length}`);
    console.log(`  - Agent Runs: ${testAgents.reduce((sum, agent) => sum + agent.agentRuns.length, 0)}`);

    // Display what will be deleted
    console.log('\n🗑️ Test data to be deleted:');
    
    if (testLogins.length > 0) {
      console.log('\n  Test Logins:');
      testLogins.forEach(login => {
        console.log(`    - ${login.name} (${login.loginUrl})`);
      });
    }

    if (testAgents.length > 0) {
      console.log('\n  Test Agents:');
      testAgents.forEach(agent => {
        console.log(`    - ${agent.name} (${agent.status}) - ${agent.agentRuns.length} runs`);
      });
    }

    // Delete in correct order (respecting foreign key constraints)
    console.log('\n🚀 Starting cleanup...');

    // 1. Delete agent runs first
    let deletedRuns = 0;
    for (const agent of testAgents) {
      if (agent.agentRuns.length > 0) {
        const result = await prisma.agentRun.deleteMany({
          where: { agentId: agent.id }
        });
        deletedRuns += result.count;
      }
    }
    console.log(`✅ Deleted ${deletedRuns} agent runs`);

    // 2. Delete agent-login associations
    let deletedAssociations = 0;
    for (const agent of testAgents) {
      if (agent.agentLogins.length > 0) {
        const result = await prisma.agentLogin.deleteMany({
          where: { agentId: agent.id }
        });
        deletedAssociations += result.count;
      }
    }
    console.log(`✅ Deleted ${deletedAssociations} agent-login associations`);

    // 3. Delete agents
    const deletedAgents = await prisma.agent.deleteMany({
      where: { ownerId: testUser.id }
    });
    console.log(`✅ Deleted ${deletedAgents.count} agents`);

    // 4. Delete logins
    const deletedLogins = await prisma.login.deleteMany({
      where: { ownerId: testUser.id }
    });
    console.log(`✅ Deleted ${deletedLogins.count} logins`);

    // 5. Delete the test user
    const deletedUser = await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log(`✅ Deleted test user: ${deletedUser.email}`);

    console.log('\n🎉 Test data cleanup completed successfully!');
    console.log('\n📝 Summary of deleted items:');
    console.log(`  - Test user: 1 (test@example.com)`);
    console.log(`  - Test logins: ${deletedLogins.count}`);
    console.log(`  - Test agents: ${deletedAgents.count}`);
    console.log(`  - Agent runs: ${deletedRuns}`);
    console.log(`  - Agent-login associations: ${deletedAssociations}`);

    console.log('\n✅ Your real data has been preserved!');
    console.log('   - Your real logins are still there');
    console.log('   - Your real agents are still there');
    console.log('   - All your real agent runs are preserved');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupTestData();
