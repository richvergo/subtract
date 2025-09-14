# 🚀 Test Data Setup Guide - AI Agents Platform

This guide will help you set up test data for the vergo AI agents platform to test the complete workflow recording, processing, and execution flow.

## 📋 Prerequisites

1. **Node.js** installed
2. **npm** installed
3. **Development server** running (`npm run dev`)

## 🔧 Step-by-Step Setup

### Step 1: Create Environment File

Create a file named `.env.local` in the project root with this content:

```bash
# Environment Variables for AI Agents Platform
# Development Configuration

# Database (SQLite for development)
DATABASE_URL="file:./prisma/dev.db"

# Redis (using mock for development)
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption (development key - DO NOT USE IN PRODUCTION)
ENCRYPTION_KEY_BASE64=YWJjZGVmZ2hpams7bG1ub3BxcnN0dXZ3eHl6MTIzNDU2Nzg5MA==

# Internal API token (development token)
INTERNAL_RUNNER_TOKEN=dev-token-1234567890abcdef

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-nextauth-secret-key-1234567890

# API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# LLM Integration (for intent generation and selector repair)
OPENAI_API_KEY=your-openai-api-key-here

# Puppeteer (skip download for development)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Environment
NODE_ENV=development
```

### Step 2: Run Database Setup

Execute the setup script:

```bash
node setup-database.js
```

This will:
- Generate Prisma client
- Push schema to database
- Create test data with enriched metadata

### Step 3: Verify Setup

Test that everything is working:

```bash
node test-database.js
```

You should see:
- ✅ Database connection successful
- ✅ Test user found: Test User (test@example.com)
- ✅ Found 3 logins with encrypted credentials
- ✅ Found 3 agents with enriched metadata and processing status
- ✅ Found 0 agent runs (initially)

## 🎯 Test Data Created

### Test User
- **Email**: `test@example.com`
- **Password**: `secret123`
- **Name**: Test User

### Test Logins
1. **Google Slides**
   - URL: https://slides.google.com
   - Username: test@example.com
   - Password: testpassword123

2. **Notion**
   - URL: https://notion.so
   - Username: test@notion.com
   - Password: notionpass456

3. **Airtable**
   - URL: https://airtable.com
   - Username: test@airtable.com
   - Password: airtablepass789

### Test Agents
1. **Presentation Creator** (DRAFT)
   - Purpose: Create Google Slides presentations for client meetings
   - Enriched metadata: DOM elements, timestamps, intent annotations
   - Uses: Google Slides login
   - Status: DRAFT, Processing: ready

2. **Data Entry Bot** (DRAFT)
   - Purpose: Automate data entry into Airtable databases
   - Enriched metadata: Form fields, validation rules, intent descriptions
   - Uses: Airtable login
   - Status: DRAFT, Processing: ready

3. **Document Organizer** (ACTIVE)
   - Purpose: Organize and categorize documents in Notion
   - Enriched metadata: File types, folder structures, intent mappings
   - Uses: Notion login
   - Status: ACTIVE, Processing: ready

## 🧪 Testing the Happy Path

### 1. Login to the App
1. Go to http://localhost:3000
2. Click "Get Started - Sign Up / Login"
3. Use credentials: `test@example.com` / `secret123`

### 2. View Test Data
1. Navigate to `/logins` - you should see 3 encrypted logins
2. Navigate to `/agents` - you should see 3 agents with enriched metadata

### 3. Test AI Agent Workflow
1. **Upload Recording**: Test recording upload with metadata extraction
2. **View Processing**: Monitor background processing and intent generation
3. **Review Configuration**: Check generated agent config with DOM metadata
4. **Test Execution**: Run agent with primary selectors
5. **Test Fallback Repair**: Trigger LLM selector repair on failed automation
6. **View Repair Logs**: Check repair attempts with confidence scores

### 4. Expected Behavior
- **DRAFT agents**: Show "Test Run" and "Activate" buttons
- **ACTIVE agents**: Show "Run Live" button with prompt input
- **Processing status**: Real-time updates during recording processing
- **Enriched metadata**: DOM elements, timestamps, intent descriptions
- **Repair logs**: LLM reasoning and confidence scores for selector repairs

## 🔍 Troubleshooting

### Issue: "Database connection failed"
- Check that `.env.local` file exists and has correct content
- Ensure `DATABASE_URL` points to the correct SQLite file

### Issue: "Test user not found"
- Run `node create-test-data-simple.js` to create the test user
- Check that the user was created with email `test@example.com`

### Issue: "No test data visible"
- Run `node test-database.js` to verify data exists
- Check browser console for any JavaScript errors
- Ensure you're logged in with the test user

### Issue: "Commands getting stuck"
- Try running commands one at a time
- Check if the development server is running
- Restart the terminal and try again

## 🎉 Success!

Once everything is working, you should be able to:
- ✅ View existing logins with encrypted credentials
- ✅ Upload workflow recordings and process them
- ✅ Create agents from recordings with enriched metadata
- ✅ Generate LLM intent annotations for workflow steps
- ✅ Execute agents with primary automation
- ✅ Trigger LLM fallback repair when selectors fail
- ✅ View repair logs with confidence scores and reasoning
- ✅ Test login connections and credential management
- ✅ See processing status and metadata in agent details

The complete AI agents workflow is now ready for testing! 🚀
