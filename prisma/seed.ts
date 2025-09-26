import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Puppeteer stack seeding...');

  try {
    // Create test users for the pure Puppeteer stack
    const testUsers = [
      {
        email: 'test@example.com',
        passwordHash: await hash('password123', 10),
        name: 'Test User'
      },
      {
        email: 'alice@example.com',
        passwordHash: await hash('password123', 10),
        name: 'Alice Smith'
      },
      {
        email: 'bob@example.com',
        passwordHash: await hash('password123', 10),
        name: 'Bob Johnson'
      }
    ];

    for (const user of testUsers) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user
      });
    }

    console.log('✅ Test users created successfully');
    console.log('📧 Login with: test@example.com, alice@example.com, or bob@example.com');
    console.log('🔑 Password: password123');

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