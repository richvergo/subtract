import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting backend stability seeding...');

  try {
    await prisma.$transaction(async (tx) => {
      // Clear existing data for clean seed
      await tx.agentRun.deleteMany();
      await tx.agentLogin.deleteMany();
      await tx.agent.deleteMany();
      await tx.login.deleteMany();
      await tx.membership.deleteMany();
      await tx.user.deleteMany();
      await tx.entity.deleteMany();

      console.log('🧹 Cleared existing data');

      // Hash password for all users
      const passwordHash = await hash('password123', 10);

      // Create test users with proper bcrypt hashed passwords
      const users = [
        {
          email: 'alice@example.com',
          name: 'Alice Test',
          passwordHash,
        },
        {
          email: 'bob@example.com', 
          name: 'Bob Test',
          passwordHash,
        },
      ];

      console.log('👥 Creating test users...');
      const createdUsers = [];
      
      for (const userData of users) {
        const user = await tx.user.create({
          data: userData,
        });
        createdUsers.push(user);
        console.log(`✅ Created user: ${user.name} (${user.email})`);
      }

      // Create a test entity
      const testEntity = await tx.entity.create({
        data: {
          name: 'Test Company',
        },
      });
      console.log(`✅ Created entity: ${testEntity.name}`);

      // Create memberships
      await tx.membership.create({
        data: {
          userId: createdUsers[0].id,
          entityId: testEntity.id,
          role: 'ADMIN',
        },
      });

      await tx.membership.create({
        data: {
          userId: createdUsers[1].id,
          entityId: testEntity.id,
          role: 'EMPLOYEE',
        },
      });
      console.log('✅ Created memberships');

      // Create test logins
      const testLogins = [
        {
          name: 'Google Slides',
          loginUrl: 'https://slides.google.com',
          username: 'alice@example.com',
          password: 'testpassword123',
          ownerId: createdUsers[0].id,
        },
        {
          name: 'Notion',
          loginUrl: 'https://notion.so',
          username: 'bob@example.com',
          password: 'notionpass456',
          ownerId: createdUsers[1].id,
        },
      ];

      console.log('🔐 Creating test logins...');
      const createdLogins = [];
      
      for (const loginData of testLogins) {
        const login = await tx.login.create({
          data: loginData,
        });
        createdLogins.push(login);
        console.log(`✅ Created login: ${login.name}`);
      }

      // Create test agents
      const testAgents = [
        {
          name: 'Presentation Creator',
          description: 'Creates presentations automatically from templates',
          agentConfig: JSON.stringify([
            { action: 'goto', url: 'https://slides.google.com' },
            { action: 'type', selector: 'input[type="email"]', value: '{{login.username}}' },
            { action: 'type', selector: 'input[type="password"]', value: '{{login.password}}' },
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForSelector', selector: '.new-presentation' },
            { action: 'click', selector: '.new-presentation' },
          ]),
          purposePrompt: 'Create a new presentation from a template',
          status: 'DRAFT' as const,
          ownerId: createdUsers[0].id,
        },
        {
          name: 'Data Entry Bot',
          description: 'Automates data entry tasks in spreadsheets',
          agentConfig: JSON.stringify([
            { action: 'goto', url: 'https://airtable.com' },
            { action: 'type', selector: 'input[type="email"]', value: '{{login.username}}' },
            { action: 'type', selector: 'input[type="password"]', value: '{{login.password}}' },
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'waitForSelector', selector: '.add-record' },
            { action: 'click', selector: '.add-record' },
          ]),
          purposePrompt: 'Automate data entry in Airtable',
          status: 'ACTIVE' as const,
          ownerId: createdUsers[1].id,
        },
      ];

      console.log('🤖 Creating test agents...');
      const createdAgents = [];
      
      for (const agentData of testAgents) {
        const agent = await tx.agent.create({
          data: agentData,
        });
        createdAgents.push(agent);
        console.log(`✅ Created agent: ${agent.name} (${agent.status})`);
      }

      // Link agents to logins
      console.log('🔗 Linking agents to logins...');
      
      await tx.agentLogin.create({
        data: {
          agentId: createdAgents[0].id,
          loginId: createdLogins[0].id,
        },
      });

      await tx.agentLogin.create({
        data: {
          agentId: createdAgents[1].id,
          loginId: createdLogins[1].id,
        },
      });
      
      console.log('✅ Linked agents to logins');
    });

    console.log('\n🎉 Backend stability seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 2 Test Users with bcrypt hashed passwords');
    console.log('- 1 Test Entity with memberships');
    console.log('- 2 Test Logins (Google Slides, Notion)');
    console.log('- 2 Test Agents (Draft, Active)');
    console.log('\n🔐 Test Login Credentials:');
    console.log('- Alice: alice@example.com / password123');
    console.log('- Bob: bob@example.com / password123');
    console.log('\n🚀 Backend is now stable and ready for frontend development!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });