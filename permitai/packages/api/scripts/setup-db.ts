#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDatabase() {
  console.log('🚀 Setting up PermitAI database...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Run migrations
    console.log('📦 Running migrations...');
    execSync('npx prisma migrate dev --name init', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // Check if database has data
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('\n🌱 Database is empty. Run seed script to add sample data:');
      console.log('   npx prisma db seed\n');
    } else {
      console.log(`\n✨ Database ready with ${userCount} users\n`);
    }

    // Show some stats
    const stats = {
      users: await prisma.user.count(),
      roles: await prisma.role.count(),
      departments: await prisma.department.count(),
      permitTypes: await prisma.permitType.count(),
      permits: await prisma.permit.count(),
    };

    console.log('📊 Database Statistics:');
    Object.entries(stats).forEach(([model, count]) => {
      console.log(`   ${model}: ${count}`);
    });

    console.log('\n🎉 Setup complete! You can now:');
    console.log('   - Run the API: npm run dev');
    console.log('   - Open Prisma Studio: npx prisma studio');
    console.log('   - Seed sample data: npx prisma db seed\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Is Docker running? Check with: docker ps');
    console.log('   2. Is PostgreSQL running on port 5432?');
    console.log('   3. Check your DATABASE_URL in .env');
    console.log('   4. Try: docker compose up -d postgres\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();