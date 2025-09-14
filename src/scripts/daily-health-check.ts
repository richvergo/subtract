#!/usr/bin/env ts-node

/**
 * Daily Health Check Script
 * Runs daily to check the health of all logins
 * Can be scheduled with cron or GitHub Actions
 */

import { PrismaClient } from '@prisma/client';
import { LoginHealthChecker } from '../lib/login-health-checker';

const prisma = new PrismaClient();

async function dailyHealthCheck() {
  console.log('🔍 Starting daily login health check...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  
  try {
    // Get all logins that need health checks
    const logins = await prisma.login.findMany({
      select: {
        id: true,
        name: true,
        owner: {
          select: {
            email: true,
            name: true
          }
        },
        lastCheckedAt: true,
        status: true
      }
    });

    console.log(`📊 Found ${logins.length} logins to check`);

    if (logins.length === 0) {
      console.log('✅ No logins found. Exiting.');
      return;
    }

    // Initialize health checker
    const healthChecker = new LoginHealthChecker();
    
    // Check each login
    const results = [];
    for (const login of logins) {
      console.log(`\n🔍 Checking: ${login.name} (${login.owner.email})`);
      
      try {
        const result = await healthChecker.checkLoginHealth(login.id);
        results.push({
          loginId: login.id,
          loginName: login.name,
          ownerEmail: login.owner.email,
          ...result
        });
        
        console.log(`   Status: ${result.status}`);
        console.log(`   Success: ${result.success}`);
        if (result.errorMessage) {
          console.log(`   Error: ${result.errorMessage}`);
        }
        if (result.responseTime) {
          console.log(`   Response Time: ${result.responseTime}ms`);
        }
        
        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`   ❌ Failed to check ${login.name}:`, error);
        results.push({
          loginId: login.id,
          loginName: login.name,
          ownerEmail: login.owner.email,
          success: false,
          status: 'BROKEN',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date()
        });
      }
    }

    // Close browser
    await healthChecker.close();

    // Generate summary
    const summary = {
      total: results.length,
      active: results.filter(r => r.status === 'ACTIVE').length,
      broken: results.filter(r => r.status === 'BROKEN').length,
      expired: results.filter(r => r.status === 'EXPIRED').length,
      suspended: results.filter(r => r.status === 'SUSPENDED').length,
      unknown: results.filter(r => r.status === 'UNKNOWN').length
    };

    console.log('\n📊 Daily Health Check Summary:');
    console.log(`   Total Logins: ${summary.total}`);
    console.log(`   ✅ Active: ${summary.active}`);
    console.log(`   ❌ Broken: ${summary.broken}`);
    console.log(`   ⚠️  Expired: ${summary.expired}`);
    console.log(`   🚫 Suspended: ${summary.suspended}`);
    console.log(`   ❓ Unknown: ${summary.unknown}`);

    // Log broken logins for attention
    const brokenLogins = results.filter(r => r.status === 'BROKEN');
    if (brokenLogins.length > 0) {
      console.log('\n🚨 Broken Logins Requiring Attention:');
      brokenLogins.forEach(login => {
        console.log(`   - ${login.loginName} (${login.ownerEmail})`);
        if (login.errorMessage) {
          console.log(`     Error: ${login.errorMessage}`);
        }
      });
    }

    // Log expired logins
    const expiredLogins = results.filter(r => r.status === 'EXPIRED');
    if (expiredLogins.length > 0) {
      console.log('\n⚠️  Expired Logins:');
      expiredLogins.forEach(login => {
        console.log(`   - ${login.loginName} (${login.ownerEmail})`);
      });
    }

    console.log('\n✅ Daily health check completed successfully');

  } catch (error) {
    console.error('❌ Daily health check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the health check
if (require.main === module) {
  dailyHealthCheck()
    .then(() => {
      console.log('🎉 Health check script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Health check script failed:', error);
      process.exit(1);
    });
}

export { dailyHealthCheck };
