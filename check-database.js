#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking database contents...');
  
  try {
    // Check users
    const users = await prisma.user.findMany();
    console.log(`\n👥 Users (${users.length}):`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.name})`);
    });
    
    // Check logins
    const logins = await prisma.login.findMany({
      include: { owner: true }
    });
    console.log(`\n🔐 Logins (${logins.length}):`);
    logins.forEach(login => {
      console.log(`   - ${login.name} (${login.owner.email})`);
      console.log(`     URL: ${login.loginUrl}`);
      console.log(`     Username: ${login.username}`);
    });
    
    // Check agents
    const agents = await prisma.agent.findMany({
      include: { 
        owner: true,
        agentLogins: {
          include: { login: true }
        }
      }
    });
    console.log(`\n🤖 Agents (${agents.length}):`);
    agents.forEach(agent => {
      console.log(`   - ${agent.name} (${agent.owner.email})`);
      console.log(`     Status: ${agent.status}`);
      console.log(`     Logins: ${agent.agentLogins.length}`);
      agent.agentLogins.forEach(al => {
        console.log(`       - ${al.login.name}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
