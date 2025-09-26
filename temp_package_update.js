const fs = require('fs')
const path = require('path')

// Read current package.json
const packagePath = path.join(__dirname, 'package.json')
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

// Add Puppeteer guardrail scripts
packageData.scripts['puppeteer:enforce'] = 'node scripts/enforce-puppeteer-guardrails.js'
packageData.scripts['puppeteer:validate'] = 'node scripts/enforce-puppeteer-guardrails.js'
packageData.scripts['prebuild'] = 'npm run puppeteer:enforce'

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2))
console.log('✅ Added Puppeteer guardrail enforcement to package.json')
