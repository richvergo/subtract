#!/usr/bin/env node

/**
 * Test Login Flow
 * Simulates logging in and checking if data is accessible
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLoginFlow() {
  console.log('🔐 Testing Login Flow...');
  
  try {
    // Find Alice's account
    const alice = await prisma.user.findUnique({
      where: { email: 'alice@alpha.com' }
    });
    
    if (!alice) {
      console.log('❌ Alice account not found');
      return;
    }
    
    console.log('✅ Found Alice account:');
    console.log(`   Email: ${alice.email}`);
    console.log(`   Name: ${alice.name}`);
    console.log(`   ID: ${alice.id}`);
    
    // Check Alice's logins
    const logins = await prisma.login.findMany({
      where: { ownerId: alice.id }
    });
    
    console.log(`\n🔐 Alice's Logins (${logins.length}):`);
    logins.forEach(login => {
      console.log(`   - ${login.name}`);
      console.log(`     URL: ${login.loginUrl}`);
      console.log(`     Username: ${login.username} (encrypted)`);
      console.log(`     Created: ${login.createdAt}`);
    });
    
    // Check Alice's agents
    const agents = await prisma.agent.findMany({
      where: { ownerId: alice.id },
      include: {
        agentLogins: {
          include: { login: true }
        }
      }
    });
    
    console.log(`\n🤖 Alice's Agents (${agents.length}):`);
    agents.forEach(agent => {
      console.log(`   - ${agent.name}`);
      console.log(`     Status: ${agent.status}`);
      console.log(`     Description: ${agent.description}`);
      console.log(`     Logins: ${agent.agentLogins.length}`);
      agent.agentLogins.forEach(al => {
        console.log(`       - ${al.login.name}`);
      });
    });
    
    console.log('\n🎯 Login Instructions:');
    console.log('1. Go to: http://localhost:3000/register');
    console.log('2. Click "Sign In" (toggle from Sign Up)');
    console.log('3. Enter:');
    console.log('   - Email: alice@alpha.com');
    console.log('   - Password: password123');
    console.log('4. Click "Sign In"');
    console.log('5. Navigate to: http://localhost:3000/logins');
    console.log('6. You should see your Google Slides login!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLoginFlow();
