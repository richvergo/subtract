#!/usr/bin/env node

/**
 * PUPPETEER GUARDRAILS ENFORCEMENT SCRIPT
 * 
 * This script automatically scans the codebase for forbidden mock data patterns
 * and prevents deployment if violations are found.
 * 
 * Run this script in CI/CD to ensure NO MOCK DATA ever reaches production.
 */

const fs = require('fs')
const path = require('path')

// 🚨 FORBIDDEN PATTERNS - THESE WILL FAIL THE BUILD
const FORBIDDEN_PATTERNS = [
  // Mock data patterns
  /demo_\w+/g,
  /mock_\w+/g,
  /fake_\w+/g,
  /test_data/g,
  /sample_\w+/g,
  /placeholder_\w+/g,
  /dummy_\w+/g,
  
  // Specific mock data violations
  /actionsCaptured:\s*[0-9]+/g,
  /screenshotsTaken:\s*[0-9]+/g,
  /networkRequests:\s*[0-9]+/g,
  /consoleLogs:\s*[0-9]+/g,
  /"Load Demo Session"/g,
  /"Create Demo"/g,
  /"Mock Session"/g,
  
  // Mock screenshot patterns
  /iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==/g,
  
  // Mock action patterns
  /id:\s*['"]demo-\d+['"]/g,
  /selector:\s*['"]button['"].*value:\s*['"]Click me['"]/g,
  /coordinates:\s*{\s*x:\s*100,\s*y:\s*200\s*}/g
]

// Files to scan
const SCAN_DIRECTORIES = [
  'src/app/components/workflows',
  'src/lib/agents',
  'src/app/api'
]

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /\.d\.ts$/,
  /enforce-puppeteer-guardrails\.js$/
]

class PuppeteerGuardrailEnforcer {
  constructor() {
    this.violations = []
    this.scannedFiles = 0
  }

  scanFile(filePath) {
    if (EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))) {
      return
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      this.scannedFiles++

      FORBIDDEN_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern)
        if (matches) {
          matches.forEach(match => {
            this.violations.push({
              file: filePath,
              pattern: pattern.toString(),
              match: match,
              line: this.getLineNumber(content, match)
            })
          })
        }
      })
    } catch (error) {
      console.warn(`Warning: Could not scan file ${filePath}: ${error.message}`)
    }
  }

  getLineNumber(content, match) {
    const lines = content.substring(0, content.indexOf(match)).split('\n')
    return lines.length
  }

  scanDirectory(directory) {
    if (!fs.existsSync(directory)) {
      console.warn(`Warning: Directory ${directory} does not exist`)
      return
    }

    const items = fs.readdirSync(directory)
    
    items.forEach(item => {
      const fullPath = path.join(directory, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        this.scanDirectory(fullPath)
      } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
        this.scanFile(fullPath)
      }
    })
  }

  enforce() {
    console.log('🛡️  PUPPETEER GUARDRAILS ENFORCEMENT STARTING...')
    console.log('🚨 Scanning for forbidden mock data patterns...')
    
    SCAN_DIRECTORIES.forEach(directory => {
      console.log(`📁 Scanning directory: ${directory}`)
      this.scanDirectory(directory)
    })

    console.log(`\n📊 SCAN RESULTS:`)
    console.log(`   Files scanned: ${this.scannedFiles}`)
    console.log(`   Violations found: ${this.violations.length}`)

    if (this.violations.length > 0) {
      console.log('\n🚨 GUARDRAIL VIOLATIONS DETECTED:')
      console.log('=' .repeat(80))
      
      this.violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. 🚨 VIOLATION in ${violation.file}:${violation.line}`)
        console.log(`   Pattern: ${violation.pattern}`)
        console.log(`   Match: "${violation.match}"`)
        console.log(`   ❌ This violates the strategic Puppeteer approach!`)
      })

      console.log('\n' + '=' .repeat(80))
      console.log('🚨 BUILD FAILED - MOCK DATA DETECTED!')
      console.log('🛡️  STRATEGIC PUPPETEER PRINCIPLES VIOLATED!')
      console.log('')
      console.log('✅ TO FIX:')
      console.log('   1. Remove all mock data and demo sessions')
      console.log('   2. Use REAL Puppeteer browser automation only')
      console.log('   3. Capture REAL screenshots with page.screenshot()')
      console.log('   4. Record REAL interactions with DOM event listeners')
      console.log('   5. Use REAL performance metrics from Puppeteer')
      console.log('')
      console.log('❌ NEVER use mock data, demo sessions, or workarounds!')
      console.log('✅ ALWAYS use native Puppeteer APIs and real browser automation!')
      
      process.exit(1)
    } else {
      console.log('\n✅ GUARDRAILS PASSED - NO MOCK DATA DETECTED!')
      console.log('🚀 Strategic Puppeteer implementation validated!')
      console.log('✅ All data comes from REAL Puppeteer browser automation!')
      process.exit(0)
    }
  }
}

// Run the enforcement
const enforcer = new PuppeteerGuardrailEnforcer()
enforcer.enforce()
