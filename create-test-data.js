const { PrismaClient } = require('@prisma/client');
const { encrypt, decrypt } = require('./src/lib/encryption');

const prisma = new PrismaClient();

async function createTestData() {
  console.log('🌱 Creating test agents and logins...');

  try {
    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (!testUser) {
      console.log('❌ Test user not found. Please run the app and create a user first.');
      return;
    }

    console.log(`✅ Found test user: ${testUser.name} (${testUser.email})`);

    // Create test logins
    const logins = [
      {
        name: 'Google Slides',
        loginUrl: 'https://slides.google.com',
        username: 'test@example.com',
        password: 'testpassword123'
      },
      {
        name: 'Notion',
        loginUrl: 'https://notion.so',
        username: 'test@notion.com',
        password: 'notionpass456'
      },
      {
        name: 'Airtable',
        loginUrl: 'https://airtable.com',
        username: 'test@airtable.com',
        password: 'airtablepass789'
      }
    ];

    console.log('🔐 Creating test logins...');
    const createdLogins = [];
    
    for (const loginData of logins) {
      const login = await prisma.login.create({
        data: {
          name: loginData.name,
          loginUrl: loginData.loginUrl,
          username: encrypt(loginData.username),
          password: encrypt(loginData.password),
          ownerId: testUser.id
        }
      });
      createdLogins.push(login);
      console.log(`✅ Created login: ${login.name}`);
    }

    // Create test agents
    const agents = [
      {
        name: 'Presentation Creator',
        description: 'Creates presentations automatically from templates',
        config: JSON.stringify([
          { action: 'goto', url: 'https://slides.google.com' },
          { action: 'type', selector: 'input[type="email"]', value: '{{login.username}}' },
          { action: 'type', selector: 'input[type="password"]', value: '{{login.password}}' },
          { action: 'click', selector: 'button[type="submit"]' },
          { action: 'waitForSelector', selector: '.new-presentation' },
          { action: 'click', selector: '.new-presentation' }
        ]),
        status: 'DRAFT'
      },
      {
        name: 'Data Entry Bot',
        description: 'Automates data entry tasks in spreadsheets',
        config: JSON.stringify([
          { action: 'goto', url: 'https://airtable.com' },
          { action: 'type', selector: 'input[type="email"]', value: '{{login.username}}' },
          { action: 'type', selector: 'input[type="password"]', value: '{{login.password}}' },
          { action: 'click', selector: 'button[type="submit"]' },
          { action: 'waitForSelector', selector: '.add-record' },
          { action: 'click', selector: '.add-record' }
        ]),
        status: 'DRAFT'
      },
      {
        name: 'Document Organizer',
        description: 'Organizes documents and creates structured workflows',
        config: JSON.stringify([
          { action: 'goto', url: 'https://notion.so' },
          { action: 'type', selector: 'input[type="email"]', value: '{{login.username}}' },
          { action: 'type', selector: 'input[type="password"]', value: '{{login.password}}' },
          { action: 'click', selector: 'button[type="submit"]' },
          { action: 'waitForSelector', selector: '.new-page' },
          { action: 'click', selector: '.new-page' }
        ]),
        status: 'ACTIVE'
      }
    ];

    console.log('🤖 Creating test agents...');
    const createdAgents = [];
    
    for (const agentData of agents) {
      const agent = await prisma.agent.create({
        data: {
          name: agentData.name,
          description: agentData.description,
          config: agentData.config,
          status: agentData.status,
          ownerId: testUser.id
        }
      });
      createdAgents.push(agent);
      console.log(`✅ Created agent: ${agent.name} (${agent.status})`);
    }

    // Link agents to logins
    console.log('🔗 Linking agents to logins...');
    
    // Presentation Creator uses Google Slides
    await prisma.agentLogin.create({
      data: {
        agentId: createdAgents[0].id,
        loginId: createdLogins[0].id
      }
    });
    console.log(`✅ Linked ${createdAgents[0].name} to ${createdLogins[0].name}`);

    // Data Entry Bot uses Airtable
    await prisma.agentLogin.create({
      data: {
        agentId: createdAgents[1].id,
        loginId: createdLogins[2].id
      }
    });
    console.log(`✅ Linked ${createdAgents[1].name} to ${createdLogins[2].name}`);

    // Document Organizer uses Notion
    await prisma.agentLogin.create({
      data: {
        agentId: createdAgents[2].id,
        loginId: createdLogins[1].id
      }
    });
    console.log(`✅ Linked ${createdAgents[2].name} to ${createdLogins[1].name}`);

    // Create some test agent runs
    console.log('🏃 Creating test agent runs...');
    
    const testRuns = [
      {
        agentId: createdAgents[0].id,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        finishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000), // 5 minutes later
        logs: JSON.stringify([
          { timestamp: new Date().toISOString(), message: 'Starting presentation creation workflow' },
          { timestamp: new Date().toISOString(), message: 'Navigated to Google Slides' },
          { timestamp: new Date().toISOString(), message: 'Logged in successfully' },
          { timestamp: new Date().toISOString(), message: 'Created new presentation' }
        ]),
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        userConfirmed: true
      },
      {
        agentId: createdAgents[1].id,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        finishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000 + 3 * 60 * 1000), // 3 minutes later
        logs: JSON.stringify([
          { timestamp: new Date().toISOString(), message: 'Starting data entry workflow' },
          { timestamp: new Date().toISOString(), message: 'Navigated to Airtable' },
          { timestamp: new Date().toISOString(), message: 'Logged in successfully' },
          { timestamp: new Date().toISOString(), message: 'Added new record' }
        ]),
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        userConfirmed: false,
        userFeedback: 'The data entry was successful but the formatting could be improved.'
      },
      {
        agentId: createdAgents[2].id,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        finishedAt: new Date(Date.now() - 30 * 60 * 1000 + 2 * 60 * 1000), // 2 minutes later
        logs: JSON.stringify([
          { timestamp: new Date().toISOString(), message: 'Starting document organization workflow' },
          { timestamp: new Date().toISOString(), message: 'Navigated to Notion' },
          { timestamp: new Date().toISOString(), message: 'Logged in successfully' },
          { timestamp: new Date().toISOString(), message: 'Created new page' }
        ]),
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        prompt: 'Create a new project page for Q4 planning',
        userConfirmed: true
      }
    ];

    for (const runData of testRuns) {
      const run = await prisma.agentRun.create({
        data: runData
      });
      console.log(`✅ Created agent run for ${createdAgents.find(a => a.id === runData.agentId)?.name} (${runData.status})`);
    }

    console.log('\n🎉 Test data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${createdLogins.length} logins created`);
    console.log(`- ${createdAgents.length} agents created`);
    console.log(`- ${testRuns.length} agent runs created`);
    console.log('\n🚀 You can now test the complete happy path flow!');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
