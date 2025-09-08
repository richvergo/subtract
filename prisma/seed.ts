import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting enhanced database seeding...');

  // Get current month for MonthClose labels
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    await prisma.$transaction(async (tx) => {
      // Check if data already exists (idempotency)
      const existingUsers = await tx.user.count();
      if (existingUsers > 0) {
        console.log('📊 Database already contains data. Skipping seed to maintain idempotency.');
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

      console.log('📅 Creating month closes...');
      
      // Create MonthClose for Alpha Corp
      const alphaMonth = await tx.monthClose.create({
        data: {
          entityId: alphaCorp.id,
          label: currentMonth,
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        }
      });
      console.log(`✅ Created MonthClose for Alpha Corp: ${currentMonth}`);

      // Create MonthClose for Beta LLC
      const betaMonth = await tx.monthClose.create({
        data: {
          entityId: betaLLC.id,
          label: currentMonth,
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        }
      });
      console.log(`✅ Created MonthClose for Beta LLC: ${currentMonth}`);

      console.log('�� Creating checklist items...');
      
      // Create ChecklistItems for Alpha Corp
      const alphaItem1 = await tx.checklistItem.create({
        data: {
          monthId: alphaMonth.id,
          title: 'Revenue Recognition Review',
          owner: alice.id,
          assignee: carol.id,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
          status: 'IN_PROGRESS',
          notes: 'Review all revenue recognition policies and ensure compliance'
        }
      });
      console.log(`✅ Created checklist item: ${alphaItem1.title} (Owner: Alice, Assignee: Carol)`);

      const alphaItem2 = await tx.checklistItem.create({
        data: {
          monthId: alphaMonth.id,
          title: 'Accounts Payable Reconciliation',
          owner: bob.id,
          assignee: carol.id,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
          status: 'NOT_STARTED',
          notes: 'Reconcile all outstanding vendor invoices'
        }
      });
      console.log(`✅ Created checklist item: ${alphaItem2.title} (Owner: Bob, Assignee: Carol)`);

      const alphaItem3 = await tx.checklistItem.create({
        data: {
          monthId: alphaMonth.id,
          title: 'Financial Statement Preparation',
          owner: alice.id,
          assignee: bob.id,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 25),
          status: 'NOT_STARTED',
          notes: 'Prepare monthly financial statements for board review'
        }
      });
      console.log(`✅ Created checklist item: ${alphaItem3.title} (Owner: Alice, Assignee: Bob)`);

      // Create ChecklistItems for Beta LLC
      const betaItem1 = await tx.checklistItem.create({
        data: {
          monthId: betaMonth.id,
          title: 'Inventory Count and Valuation',
          owner: dave.id,
          assignee: erin.id,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 18),
          status: 'IN_PROGRESS',
          notes: 'Complete physical inventory count and update valuations'
        }
      });
      console.log(`✅ Created checklist item: ${betaItem1.title} (Owner: Dave, Assignee: Erin)`);

      const betaItem2 = await tx.checklistItem.create({
        data: {
          monthId: betaMonth.id,
          title: 'Tax Provision Calculation',
          owner: dave.id,
          assignee: erin.id,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 22),
          status: 'NOT_STARTED',
          notes: 'Calculate monthly tax provision and prepare tax entries'
        }
      });
      console.log(`✅ Created checklist item: ${betaItem2.title} (Owner: Dave, Assignee: Erin)`);

      // Add more checklist items to test different user assignments
      const alphaItem4 = await tx.checklistItem.create({
        data: {
          monthId: alphaMonth.id,
          title: 'Bank Reconciliation',
          owner: alice.id,
          assignee: alice.id, // Alice assigned to her own item
          dueDate: new Date(now.getFullYear(), now.getMonth(), 12),
          status: 'DONE',
          notes: 'Monthly bank reconciliation completed'
        }
      });
      console.log(`✅ Created checklist item: ${alphaItem4.title} (Owner: Alice, Assignee: Alice)`);

      const alphaItem5 = await tx.checklistItem.create({
        data: {
          monthId: alphaMonth.id,
          title: 'Expense Report Review',
          owner: bob.id,
          assignee: bob.id, // Bob assigned to his own item
          dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
          status: 'DONE',
          notes: 'Review and approve employee expense reports'
        }
      });
      console.log(`✅ Created checklist item: ${alphaItem5.title} (Owner: Bob, Assignee: Bob)`);

      const betaItem3 = await tx.checklistItem.create({
        data: {
          monthId: betaMonth.id,
          title: 'Fixed Asset Depreciation',
          owner: dave.id,
          assignee: dave.id, // Dave assigned to his own item
          dueDate: new Date(now.getFullYear(), now.getMonth(), 8),
          status: 'DONE',
          notes: 'Calculate and record monthly depreciation'
        }
      });
      console.log(`✅ Created checklist item: ${betaItem3.title} (Owner: Dave, Assignee: Dave)`);

      console.log('\n✅ Creating tasks (5 per checklist item)...');
      
      // Helper function to get random assignee from entity users
      const getRandomAssignee = (entityId: string) => {
        if (entityId === alphaCorp.id) {
          const alphaUsers = [alice.id, bob.id, carol.id];
          return alphaUsers[Math.floor(Math.random() * alphaUsers.length)];
        } else {
          const betaUsers = [dave.id, erin.id];
          return betaUsers[Math.floor(Math.random() * betaUsers.length)];
        }
      };

      // Helper function to get random status
      const getRandomStatus = () => {
        const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'DONE'];
        return statuses[Math.floor(Math.random() * statuses.length)];
      };

      // Helper function to get user name by ID
      const getUserName = (userId: string) => {
        const users = { [alice.id]: 'Alice', [bob.id]: 'Bob', [carol.id]: 'Carol', [dave.id]: 'Dave', [erin.id]: 'Erin' };
        return users[userId] || 'Unknown';
      };

      // Create 5 tasks for each checklist item
      const allChecklistItems = [
        { item: alphaItem1, title: 'Revenue Recognition Review' },
        { item: alphaItem2, title: 'Accounts Payable Reconciliation' },
        { item: alphaItem3, title: 'Financial Statement Preparation' },
        { item: alphaItem4, title: 'Bank Reconciliation' },
        { item: alphaItem5, title: 'Expense Report Review' },
        { item: betaItem1, title: 'Inventory Count and Valuation' },
        { item: betaItem2, title: 'Tax Provision Calculation' },
        { item: betaItem3, title: 'Fixed Asset Depreciation' }
      ];

      for (const { item, title } of allChecklistItems) {
        console.log(`\n📋 Creating 5 tasks for: ${title}`);
        
        // Get the entity ID for this checklist item
        const entityId = item.monthId === alphaMonth.id ? alphaCorp.id : betaLLC.id;
        
        // Create 5 tasks with random assignees and statuses
        const taskTemplates = [
          { title: 'Initial review and analysis', dueOffset: 5 },
          { title: 'Data collection and verification', dueOffset: 8 },
          { title: 'Documentation and reporting', dueOffset: 12 },
          { title: 'Quality assurance and validation', dueOffset: 15 },
          { title: 'Final approval and sign-off', dueOffset: 18 }
        ];

        for (let i = 0; i < 5; i++) {
          const template = taskTemplates[i];
          const assigneeId = getRandomAssignee(entityId);
          const status = getRandomStatus();
          const dueDate = new Date(now.getFullYear(), now.getMonth(), template.dueOffset);
          
          await tx.task.create({
            data: {
              checklistItemId: item.id,
              title: template.title,
              assignee: assigneeId,
              dueDate: dueDate,
              status: status,
              notes: `Task ${i + 1} for ${title} - assigned to ${getUserName(assigneeId)}`
            }
          });
          
          console.log(`  ✅ Task ${i + 1}: ${template.title} (Assignee: ${getUserName(assigneeId)}, Status: ${status})`);
        }
      }
    });

    console.log('\n🎉 Enhanced database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 2 Entities: Alpha Corp, Beta LLC');
    console.log('- 5 Users: Alice, Bob, Carol, Dave, Erin');
    console.log('- 5 Memberships with appropriate roles');
    console.log('- 2 MonthClose records for current month');
    console.log('- 8 ChecklistItems with proper user assignments:');
    console.log('  * Alpha Corp: 5 items (Alice owns 3, Bob owns 2)');
    console.log('  * Beta LLC: 3 items (Dave owns all)');
    console.log('- 40 Tasks (5 per checklist item) with random assignees');
    console.log('\n🔐 Role-based permissions test data:');
    console.log('- EMPLOYEE users (Carol, Erin) can only see their assigned items');
    console.log('- MANAGER users (Bob) can see all items in their entity');
    console.log('- ADMIN users (Alice, Dave) can see all items in their entity');
    console.log('\n🎯 Task assignment highlights:');
    console.log('- Each checklist item has exactly 5 tasks');
    console.log('- Tasks are randomly assigned to users within the same entity');
    console.log('- Task statuses are randomly distributed (NOT_STARTED, IN_PROGRESS, DONE)');
    console.log('- Due dates are staggered across the month');

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