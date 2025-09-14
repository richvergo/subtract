import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting new checklist system seeding...');

  try {
    await prisma.$transaction(async (tx) => {
      // Check if data already exists (idempotency)
      const existingUsers = await tx.user.count();
      if (existingUsers > 0) {
      console.log('📊 Database already contains data. Adding test agents and logins...');
      
      // Find the test user
      const testUser = await tx.user.findFirst({
        where: { email: 'test@example.com' }
      });

      if (testUser) {
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
          const existingLogin = await tx.login.findFirst({
            where: { 
              name: loginData.name,
              ownerId: testUser.id
            }
          });
          
          if (!existingLogin) {
            const login = await tx.login.create({
              data: {
                name: loginData.name,
                loginUrl: loginData.loginUrl,
                username: loginData.username, // In real app, this would be encrypted
                password: loginData.password, // In real app, this would be encrypted
                ownerId: testUser.id
              }
            });
            createdLogins.push(login);
            console.log(`✅ Created login: ${login.name}`);
          } else {
            createdLogins.push(existingLogin);
            console.log(`✅ Login already exists: ${existingLogin.name}`);
          }
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
          const existingAgent = await tx.agent.findFirst({
            where: { 
              name: agentData.name,
              ownerId: testUser.id
            }
          });
          
          if (!existingAgent) {
            const agent = await tx.agent.create({
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
          } else {
            createdAgents.push(existingAgent);
            console.log(`✅ Agent already exists: ${existingAgent.name}`);
          }
        }

        // Link agents to logins
        console.log('🔗 Linking agents to logins...');
        
        // Presentation Creator uses Google Slides
        const existingLink1 = await tx.agentLogin.findFirst({
          where: {
            agentId: createdAgents[0].id,
            loginId: createdLogins[0].id
          }
        });
        
        if (!existingLink1) {
          await tx.agentLogin.create({
            data: {
              agentId: createdAgents[0].id,
              loginId: createdLogins[0].id
            }
          });
          console.log(`✅ Linked ${createdAgents[0].name} to ${createdLogins[0].name}`);
        }

        // Data Entry Bot uses Airtable
        const existingLink2 = await tx.agentLogin.findFirst({
          where: {
            agentId: createdAgents[1].id,
            loginId: createdLogins[2].id
          }
        });
        
        if (!existingLink2) {
          await tx.agentLogin.create({
            data: {
              agentId: createdAgents[1].id,
              loginId: createdLogins[2].id
            }
          });
          console.log(`✅ Linked ${createdAgents[1].name} to ${createdLogins[2].name}`);
        }

        // Document Organizer uses Notion
        const existingLink3 = await tx.agentLogin.findFirst({
          where: {
            agentId: createdAgents[2].id,
            loginId: createdLogins[1].id
          }
        });
        
        if (!existingLink3) {
          await tx.agentLogin.create({
            data: {
              agentId: createdAgents[2].id,
              loginId: createdLogins[1].id
            }
          });
          console.log(`✅ Linked ${createdAgents[2].name} to ${createdLogins[1].name}`);
        }

        console.log('\n🎉 Test agents and logins added successfully!');
        console.log('\n📊 Summary:');
        console.log(`- ${createdLogins.length} logins available`);
        console.log(`- ${createdAgents.length} agents available`);
        console.log('\n🚀 You can now test the complete happy path flow!');
      } else {
        console.log('❌ Test user not found. Please create a user with email test@example.com first.');
      }
      
      return;
      }

      console.log('📝 Creating entities...');
      
      // Create entities
      const alphaCorp = await tx.entity.create({
        data: {
          name: 'Alpha Corp'
        }
      });
      console.log(`✅ Created entity: ${alphaCorp.name}`);

      const betaLLC = await tx.entity.create({
        data: {
          name: 'Beta LLC'
        }
      });
      console.log(`✅ Created entity: ${betaLLC.name}`);

      console.log('👥 Creating users...');
      
      // Hash password for all users
      const passwordHash = await hash('password123', 10);

      // Create users
      const alice = await tx.user.create({
        data: {
          email: 'alice@alpha.com',
          passwordHash,
          name: 'Alice'
        }
      });
      console.log(`✅ Created user: ${alice.name} (${alice.email})`);

      const bob = await tx.user.create({
        data: {
          email: 'bob@alpha.com',
          passwordHash,
          name: 'Bob'
        }
      });
      console.log(`✅ Created user: ${bob.name} (${bob.email})`);

      const carol = await tx.user.create({
        data: {
          email: 'carol@alpha.com',
          passwordHash,
          name: 'Carol'
        }
      });
      console.log(`✅ Created user: ${carol.name} (${carol.email})`);

      const dave = await tx.user.create({
        data: {
          email: 'dave@beta.com',
          passwordHash,
          name: 'Dave'
        }
      });
      console.log(`✅ Created user: ${dave.name} (${dave.email})`);

      const erin = await tx.user.create({
        data: {
          email: 'erin@beta.com',
          passwordHash,
          name: 'Erin'
        }
      });
      console.log(`✅ Created user: ${erin.name} (${erin.email})`);

      console.log('🔗 Creating memberships...');
      
      // Create memberships
      await tx.membership.create({
        data: {
          userId: alice.id,
          entityId: alphaCorp.id,
          role: 'ADMIN'
        }
      });
      console.log(`✅ Alice → ADMIN of Alpha Corp`);

      await tx.membership.create({
        data: {
          userId: bob.id,
          entityId: alphaCorp.id,
          role: 'MANAGER'
        }
      });
      console.log(`✅ Bob → MANAGER of Alpha Corp`);

      await tx.membership.create({
        data: {
          userId: carol.id,
          entityId: alphaCorp.id,
          role: 'EMPLOYEE'
        }
      });
      console.log(`✅ Carol → EMPLOYEE of Alpha Corp`);

      await tx.membership.create({
        data: {
          userId: dave.id,
          entityId: betaLLC.id,
          role: 'ADMIN'
        }
      });
      console.log(`✅ Dave → ADMIN of Beta LLC`);

      await tx.membership.create({
        data: {
          userId: erin.id,
          entityId: betaLLC.id,
          role: 'EMPLOYEE'
        }
      });
      console.log(`✅ Erin → EMPLOYEE of Beta LLC`);

      console.log('📋 Creating checklists...');
      
      // Create team checklists
      const alphaTeamChecklist = await tx.checklist.create({
        data: {
          title: 'Monthly Book Close - September 2025',
          description: 'Monthly financial close process for Alpha Corp',
          type: 'TEAM',
          entityId: alphaCorp.id,
          createdBy: alice.id,
          deadline: new Date(2025, 8, 30), // September 30, 2025
          status: 'ACTIVE'
        }
      });
      console.log(`✅ Created team checklist: ${alphaTeamChecklist.title}`);

      const betaTeamChecklist = await tx.checklist.create({
        data: {
          title: 'Monthly Book Close - September 2025',
          description: 'Monthly financial close process for Beta LLC',
          type: 'TEAM',
          entityId: betaLLC.id,
          createdBy: dave.id,
          deadline: new Date(2025, 8, 30), // September 30, 2025
          status: 'ACTIVE'
        }
      });
      console.log(`✅ Created team checklist: ${betaTeamChecklist.title}`);

      // Create personal checklists
      const alicePersonalChecklist = await tx.checklist.create({
        data: {
          title: 'Alice\'s Daily Tasks',
          description: 'Personal productivity checklist',
          type: 'PERSONAL',
          entityId: null,
          createdBy: alice.id,
          deadline: null,
          status: 'ACTIVE'
        }
      });
      console.log(`✅ Created personal checklist: ${alicePersonalChecklist.title}`);

      const bobPersonalChecklist = await tx.checklist.create({
        data: {
          title: 'Bob\'s Project Management',
          description: 'Project tracking and management tasks',
          type: 'PERSONAL',
          entityId: null,
          createdBy: bob.id,
          deadline: new Date(2025, 8, 15), // September 15, 2025
          status: 'ACTIVE'
        }
      });
      console.log(`✅ Created personal checklist: ${bobPersonalChecklist.title}`);

      console.log('👥 Adding checklist members...');
      
      // Add members to team checklists
      // Alpha Corp team checklist members
      await tx.checklistMember.create({
        data: {
          checklistId: alphaTeamChecklist.id,
          userId: alice.id,
          role: 'OWNER'
        }
      });
      await tx.checklistMember.create({
        data: {
          checklistId: alphaTeamChecklist.id,
          userId: bob.id,
          role: 'MEMBER'
        }
      });
      await tx.checklistMember.create({
        data: {
          checklistId: alphaTeamChecklist.id,
          userId: carol.id,
          role: 'MEMBER'
        }
      });
      console.log(`✅ Added members to Alpha Corp team checklist`);

      // Beta LLC team checklist members
      await tx.checklistMember.create({
        data: {
          checklistId: betaTeamChecklist.id,
          userId: dave.id,
          role: 'OWNER'
        }
      });
      await tx.checklistMember.create({
        data: {
          checklistId: betaTeamChecklist.id,
          userId: erin.id,
          role: 'MEMBER'
        }
      });
      console.log(`✅ Added members to Beta LLC team checklist`);

      console.log('📝 Creating checklist items...');
      
      // Create checklist items for Alpha Corp team checklist
      const alphaItem1 = await tx.checklistItem.create({
        data: {
          checklistId: alphaTeamChecklist.id,
          title: 'Revenue Recognition Review',
          description: 'Review all revenue recognition policies and ensure compliance',
          assignee: carol.id,
          dueDate: new Date(2025, 8, 15), // September 15
          status: 'IN_PROGRESS',
          order: 1
        }
      });
      console.log(`✅ Created checklist item: ${alphaItem1.title}`);

      const alphaItem2 = await tx.checklistItem.create({
        data: {
          checklistId: alphaTeamChecklist.id,
          title: 'Accounts Payable Reconciliation',
          description: 'Reconcile all outstanding vendor invoices',
          assignee: carol.id,
          dueDate: new Date(2025, 8, 20), // September 20
          status: 'NOT_STARTED',
          order: 2
        }
      });
      console.log(`✅ Created checklist item: ${alphaItem2.title}`);

      const alphaItem3 = await tx.checklistItem.create({
        data: {
          checklistId: alphaTeamChecklist.id,
          title: 'Financial Statement Preparation',
          description: 'Prepare monthly financial statements for board review',
          assignee: bob.id,
          dueDate: new Date(2025, 8, 25), // September 25
          status: 'NOT_STARTED',
          order: 3
        }
      });
      console.log(`✅ Created checklist item: ${alphaItem3.title}`);

      // Create checklist items for Beta LLC team checklist
      const betaItem1 = await tx.checklistItem.create({
        data: {
          checklistId: betaTeamChecklist.id,
          title: 'Inventory Count and Valuation',
          description: 'Complete physical inventory count and update valuations',
          assignee: erin.id,
          dueDate: new Date(2025, 8, 18), // September 18
          status: 'IN_PROGRESS',
          order: 1
        }
      });
      console.log(`✅ Created checklist item: ${betaItem1.title}`);

      const betaItem2 = await tx.checklistItem.create({
        data: {
          checklistId: betaTeamChecklist.id,
          title: 'Tax Provision Calculation',
          description: 'Calculate monthly tax provision and prepare tax entries',
          assignee: erin.id,
          dueDate: new Date(2025, 8, 22), // September 22
          status: 'NOT_STARTED',
          order: 2
        }
      });
      console.log(`✅ Created checklist item: ${betaItem2.title}`);

      // Create personal checklist items
      const alicePersonalItem1 = await tx.checklistItem.create({
        data: {
          checklistId: alicePersonalChecklist.id,
          title: 'Review emails',
          description: 'Check and respond to important emails',
          assignee: alice.id,
          dueDate: null,
          status: 'DONE',
          order: 1
        }
      });
      console.log(`✅ Created personal item: ${alicePersonalItem1.title}`);

      const alicePersonalItem2 = await tx.checklistItem.create({
        data: {
          checklistId: alicePersonalChecklist.id,
          title: 'Team meeting preparation',
          description: 'Prepare agenda and materials for team meeting',
          assignee: alice.id,
          dueDate: new Date(2025, 8, 12), // September 12
          status: 'IN_PROGRESS',
          order: 2
        }
      });
      console.log(`✅ Created personal item: ${alicePersonalItem2.title}`);

      // Tasks removed - no longer using Task model
    });

    console.log('\n🎉 New checklist system seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 2 Entities: Alpha Corp, Beta LLC');
    console.log('- 5 Users: Alice, Bob, Carol, Dave, Erin');
    console.log('- 5 Memberships with appropriate roles');
    console.log('- 4 Checklists: 2 Team, 2 Personal');
    console.log('- 7 Checklist Items with proper assignments');
    console.log('\n🔐 Login credentials:');
    console.log('- Alice (Admin): alice@alpha.com / password123');
    console.log('- Bob (Manager): bob@alpha.com / password123');
    console.log('- Carol (Employee): carol@alpha.com / password123');
    console.log('- Dave (Admin): dave@beta.com / password123');
    console.log('- Erin (Employee): erin@beta.com / password123');

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