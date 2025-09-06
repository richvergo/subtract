#!/usr/bin/env node

/**
 * File Structure Verification Script
 * 
 * This script verifies that the file structure matches the expected layout
 * and identifies any potential issues that could cause module resolution conflicts.
 */

const fs = require('fs');
const path = require('path');

const EXPECTED_STRUCTURE = {
  // Root files
  'package.json': 'file',
  'tsconfig.json': 'file',
  'next.config.ts': 'file',
  '.env': 'file',
  
  // Directories
  'src': 'directory',
  'prisma': 'directory',
  'public': 'directory',
  'tests': 'directory',
  
  // Source structure
  'src/app': 'directory',
  'src/lib': 'directory',
  'src/app/api': 'directory',
  'src/app/components': 'directory',
  
  // Prisma structure
  'prisma/schema.prisma': 'file',
  'prisma/dev.db': 'file',
  'prisma/migrations': 'directory',
  
  // Key API routes
  'src/app/api/auth/[...nextauth]/route.ts': 'file',
  'src/app/api/dashboard/route.ts': 'file',
  'src/app/api/register/route.ts': 'file',
  'src/app/api/upload/preview/route.ts': 'file',
  'src/app/api/upload/ingest/route.ts': 'file',
  
  // Key components
  'src/app/components/DashboardContent.tsx': 'file',
  'src/app/page.tsx': 'file',
  'src/app/upload/page.tsx': 'file',
  'src/app/register/page.tsx': 'file',
  
  // Lib files
  'src/lib/auth.ts': 'file',
  'src/lib/db.ts': 'file',
  'src/lib/env.ts': 'file',
};

const PROBLEMATIC_PATHS = [
  'lib/', // Duplicate lib directory in root
  'src/generated/', // Incorrect Prisma generation
  'prisma/prisma/', // Nested database structure
  'src/app/test-', // Test directories
  'create_sample_excel.js', // Temporary files
  'cookies.txt', // Temporary files
];

function checkPath(expectedPath, expectedType) {
  const fullPath = path.join(process.cwd(), expectedPath);
  
  try {
    const stats = fs.statSync(fullPath);
    const actualType = stats.isDirectory() ? 'directory' : 'file';
    
    if (actualType === expectedType) {
      return { status: '✅', message: `${expectedPath} (${expectedType})` };
    } else {
      return { status: '❌', message: `${expectedPath} - Expected ${expectedType}, found ${actualType}` };
    }
  } catch (error) {
    return { status: '❌', message: `${expectedPath} - Missing` };
  }
}

function checkProblematicPaths() {
  const issues = [];
  
  for (const problematicPath of PROBLEMATIC_PATHS) {
    const fullPath = path.join(process.cwd(), problematicPath);
    
    try {
      fs.statSync(fullPath);
      issues.push({ status: '⚠️', message: `${problematicPath} - Should not exist` });
    } catch (error) {
      // Good, path doesn't exist
    }
  }
  
  return issues;
}

function checkPackageJson() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const issues = [];
    
    // Check for Turbopack flags
    if (packageJson.scripts?.dev?.includes('--turbopack')) {
      issues.push({ status: '❌', message: 'package.json dev script contains --turbopack flag' });
    }
    
    if (packageJson.scripts?.build?.includes('--turbopack')) {
      issues.push({ status: '❌', message: 'package.json build script contains --turbopack flag' });
    }
    
    return issues;
  } catch (error) {
    return [{ status: '❌', message: 'Could not read package.json' }];
  }
}

function main() {
  console.log('🔍 Verifying File Structure...\n');
  
  let allGood = true;
  
  // Check expected structure
  console.log('📁 Checking Expected Files and Directories:');
  for (const [expectedPath, expectedType] of Object.entries(EXPECTED_STRUCTURE)) {
    const result = checkPath(expectedPath, expectedType);
    console.log(`  ${result.status} ${result.message}`);
    if (result.status === '❌') allGood = false;
  }
  
  console.log('\n🚫 Checking for Problematic Paths:');
  const problematicIssues = checkProblematicPaths();
  if (problematicIssues.length === 0) {
    console.log('  ✅ No problematic paths found');
  } else {
    for (const issue of problematicIssues) {
      console.log(`  ${issue.status} ${issue.message}`);
      allGood = false;
    }
  }
  
  console.log('\n📦 Checking Package.json:');
  const packageIssues = checkPackageJson();
  if (packageIssues.length === 0) {
    console.log('  ✅ Package.json scripts look good');
  } else {
    for (const issue of packageIssues) {
      console.log(`  ${issue.status} ${issue.message}`);
      allGood = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allGood) {
    console.log('🎉 File structure verification PASSED!');
    console.log('✅ All files and directories are in the correct locations');
    console.log('✅ No problematic paths found');
    console.log('✅ Package.json configuration is correct');
  } else {
    console.log('❌ File structure verification FAILED!');
    console.log('🔧 Please fix the issues above before proceeding');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkPath, checkProblematicPaths, checkPackageJson };
