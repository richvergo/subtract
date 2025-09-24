/**
 * Workflow Integration Tests
 * Comprehensive end-to-end test suite for Capture → Replay → LogicCompile → Run → History
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { setupE2ETests, cleanupE2ETests, e2eTestDb } from '../e2e-setup'
import { POST as recordWorkflow } from '@/app/api/agents/record/route'
import { POST as generateLogic } from '@/app/api/agents/[id]/generate-logic/route'
import { POST as runWorkflow } from '@/app/api/agents/[id]/run/route'
import { GET as getRuns } from '@/app/api/agents/[id]/runs/route'
import { GET as getRunDetails } from '@/app/api/agents/[id]/runs/[runId]/route'
import { AgentRunner } from '@/lib/agents/exec/AgentRunner'
import { LogicCompiler } from '@/lib/agents/logic/LogicCompiler'
import puppeteer, { Browser, Page } from 'puppeteer'
import fs from 'fs/promises'
import path from 'path'

// Test configuration
const TEST_CONFIG = {
  PORT: 3001,
  BASE_URL: 'http://localhost:3001',
  TEST_HTML_PATH: '/tmp/test_fixture.html',
  TEST_USER: {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User'
  },
  TEST_LOGIN_CONFIG: {
    username: 'testuser',
    password: 'testpass123',
    url: 'http://localhost:3001/login'
  }
}

// Mock HTML fixture
const HTML_FIXTURE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Application</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .form-group { margin: 10px 0; }
        label { display: block; margin-bottom: 5px; }
        input, button, select { padding: 8px; margin: 5px 0; }
        button { background: #007bff; color: white; border: none; cursor: pointer; }
        button:hover { background: #0056b3; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .highlight { background-color: #ffff00 !important; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>Test Application</h1>
    
    <!-- Login Form -->
    <div id="login-section">
        <h2>Login</h2>
        <form id="login-form">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" id="login-btn">Login</button>
        </form>
    </div>
    
    <!-- Main Application (hidden initially) -->
    <div id="main-app" style="display: none;">
        <h2>Dashboard</h2>
        <div class="form-group">
            <label for="job-title">Job Title:</label>
            <input type="text" id="job-title" placeholder="Enter job title">
        </div>
        <div class="form-group">
            <label for="job-date">Job Date:</label>
            <input type="date" id="job-date">
        </div>
        <button id="add-job-btn">Add Job</button>
        
        <!-- Jobs Table -->
        <table id="jobs-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="jobs-tbody">
                <!-- Jobs will be added here -->
            </tbody>
        </table>
    </div>
    
    <script>
        let jobCounter = 1;
        
        // Login functionality
        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (username === 'testuser' && password === 'testpass123') {
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('main-app').style.display = 'block';
                console.log('Login successful');
            } else {
                alert('Invalid credentials');
            }
        });
        
        // Add job functionality
        document.getElementById('add-job-btn').addEventListener('click', function() {
            const title = document.getElementById('job-title').value;
            const date = document.getElementById('job-date').value;
            
            if (title && date) {
                const tbody = document.getElementById('jobs-tbody');
                const row = tbody.insertRow();
                row.innerHTML = \`
                    <td>\${jobCounter}</td>
                    <td>\${title}</td>
                    <td>\${date}</td>
                    <td>Pending</td>
                \`;
                jobCounter++;
                
                // Clear form
                document.getElementById('job-title').value = '';
                document.getElementById('job-date').value = '';
            }
        });
        
        // Highlight functionality for testing
        window.highlightElement = function(selector) {
            const element = document.querySelector(selector);
            if (element) {
                element.classList.add('highlight');
                setTimeout(() => element.classList.remove('highlight'), 2000);
                return true;
            }
            return false;
        };
        
        // Get page state for testing
        window.getPageState = function() {
            return {
                isLoggedIn: document.getElementById('main-app').style.display !== 'none',
                jobCount: document.querySelectorAll('#jobs-tbody tr').length,
                currentJobs: Array.from(document.querySelectorAll('#jobs-tbody tr')).map(row => ({
                    id: row.cells[0].textContent,
                    title: row.cells[1].textContent,
                    date: row.cells[2].textContent,
                    status: row.cells[3].textContent
                }))
            };
        };
    </script>
</body>
</html>
`

// Mock services
jest.mock('@/lib/llm-service', () => ({
  llmService: {
    analyzeLoginRecording: jest.fn(),
    summarizeWorkflow: jest.fn(),
    annotateWorkflow: jest.fn()
  }
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

describe('Workflow Integration Tests', () => {
  let browser: Browser
  let page: Page
  let agentRunner: AgentRunner
  let logicCompiler: LogicCompiler
  let testWorkflowId: string
  let testRunId: string

  beforeAll(async () => {
    // Setup E2E test environment
    await setupE2ETests()
    
    // Create HTML fixture
    await fs.writeFile(TEST_CONFIG.TEST_HTML_PATH, HTML_FIXTURE)
    
    // Start local server for HTML fixture
    const express = require('express')
    const app = express()
    app.use(express.static('/tmp'))
    const server = app.listen(TEST_CONFIG.PORT)
    
    // Initialize Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Initialize services
    agentRunner = new AgentRunner()
    logicCompiler = new LogicCompiler()
    
    // Mock authentication
    require('next-auth').getServerSession.mockResolvedValue({
      user: TEST_CONFIG.TEST_USER
    })
  })

  afterAll(async () => {
    // Cleanup
    if (browser) {
      await browser.close()
    }
    
    // Clean up test files
    try {
      await fs.unlink(TEST_CONFIG.TEST_HTML_PATH)
    } catch {
      // File might not exist
    }
    
    await cleanupE2ETests()
  })

  beforeEach(async () => {
    // Clean up test data
    await e2eTestDb.workflowRunStep.deleteMany()
    await e2eTestDb.workflowRun.deleteMany()
    await e2eTestDb.workflowAction.deleteMany()
    await e2eTestDb.workflowVariable.deleteMany()
    await e2eTestDb.workflow.deleteMany()
    await e2eTestDb.user.deleteMany()
    
    // Create test user
    await e2eTestDb.user.create({
      data: TEST_CONFIG.TEST_USER
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('Case 1: Capture → Persist Actions', () => {
    it('should capture workflow actions and persist them in database', async () => {
      // Navigate to test page
      await page.goto(TEST_CONFIG.BASE_URL + '/test_fixture.html')
      
      // Simulate user actions
      await page.type('#username', TEST_CONFIG.TEST_LOGIN_CONFIG.username)
      await page.type('#password', TEST_CONFIG.TEST_LOGIN_CONFIG.password)
      await page.click('#login-btn')
      
      // Wait for login to complete
      await page.waitForSelector('#main-app', { visible: true })
      
      // Add a job
      await page.type('#job-title', 'Test Job')
      await page.type('#job-date', '2024-01-15')
      await page.click('#add-job-btn')
      
      // Wait for job to be added
      await page.waitForSelector('#jobs-tbody tr', { visible: true })
      
      // Create recorded steps from the actions
      const recordedSteps = [
        {
          action: 'goto',
          url: TEST_CONFIG.BASE_URL + '/test_fixture.html',
          metadata: {
            timestamp: Date.now(),
            intent: 'Navigate to the test application',
            tag: 'body'
          }
        },
        {
          action: 'type',
          selector: '#username',
          value: TEST_CONFIG.TEST_LOGIN_CONFIG.username,
          metadata: {
            timestamp: Date.now(),
            intent: 'Enter username for login',
            selector: '#username',
            tag: 'input'
          }
        },
        {
          action: 'type',
          selector: '#password',
          value: TEST_CONFIG.TEST_LOGIN_CONFIG.password,
          metadata: {
            timestamp: Date.now(),
            intent: 'Enter password for login',
            selector: '#password',
            tag: 'input'
          }
        },
        {
          action: 'click',
          selector: '#login-btn',
          metadata: {
            timestamp: Date.now(),
            intent: 'Click login button to authenticate',
            selector: '#login-btn',
            tag: 'button'
          }
        },
        {
          action: 'type',
          selector: '#job-title',
          value: 'Test Job',
          metadata: {
            timestamp: Date.now(),
            intent: 'Enter job title',
            selector: '#job-title',
            tag: 'input'
          }
        },
        {
          action: 'type',
          selector: '#job-date',
          value: '2024-01-15',
          metadata: {
            timestamp: Date.now(),
            intent: 'Enter job date',
            selector: '#job-date',
            tag: 'input'
          }
        },
        {
          action: 'click',
          selector: '#add-job-btn',
          metadata: {
            timestamp: Date.now(),
            intent: 'Add job to the list',
            selector: '#add-job-btn',
            tag: 'button'
          }
        }
      ]

      // Create workflow via API
      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Workflow',
          description: 'Integration test workflow',
          purposePrompt: 'Login and add a job to the system',
          recordedSteps,
          requiresLogin: true,
          loginConfig: TEST_CONFIG.TEST_LOGIN_CONFIG
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await recordWorkflow(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.workflow).toBeDefined()
      expect(data.workflow.name).toBe('Test Workflow')
      expect(data.workflow.requiresLogin).toBe(true)
      expect(data.workflow.logicSpec).toBeDefined()

      // Verify workflow was persisted in database
      const workflow = await e2eTestDb.workflow.findUnique({
        where: { id: data.workflow.id },
        include: {
          actions: true,
          variables: true
        }
      })

      expect(workflow).toBeDefined()
      expect(workflow?.name).toBe('Test Workflow')
      expect(workflow?.actions).toHaveLength(recordedSteps.length)
      expect(workflow?.requiresLogin).toBe(true)

      testWorkflowId = data.workflow.id
    })
  })

  describe('Case 2: Replay → Highlight Actions', () => {
    it('should replay captured actions and highlight elements', async () => {
      // First create a workflow (reuse from previous test)
      const recordedSteps = [
        {
          action: 'goto',
          url: TEST_CONFIG.BASE_URL + '/test_fixture.html',
          metadata: { timestamp: Date.now(), intent: 'Navigate to test page' }
        },
        {
          action: 'type',
          selector: '#username',
          value: 'testuser',
          metadata: { timestamp: Date.now(), intent: 'Enter username' }
        },
        {
          action: 'click',
          selector: '#login-btn',
          metadata: { timestamp: Date.now(), intent: 'Click login button' }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Replay Test Workflow',
          description: 'Test workflow for replay functionality',
          purposePrompt: 'Test replay functionality',
          recordedSteps,
          requiresLogin: false
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await recordWorkflow(request)
      const data = await response.json()
      testWorkflowId = data.workflow.id

      // Navigate to test page
      await page.goto(TEST_CONFIG.BASE_URL + '/test_fixture.html')

      // Replay actions with highlighting
      for (const step of recordedSteps) {
        if (step.action === 'goto') {
          await page.goto(step.url!)
        } else if (step.action === 'type') {
          // Highlight element before typing
          const highlighted = await page.evaluate((selector) => {
            return window.highlightElement(selector)
          }, step.selector)
          expect(highlighted).toBe(true)
          
          await page.type(step.selector, step.value!)
        } else if (step.action === 'click') {
          // Highlight element before clicking
          const highlighted = await page.evaluate((selector) => {
            return window.highlightElement(selector)
          }, step.selector)
          expect(highlighted).toBe(true)
          
          await page.click(step.selector)
        }
      }

      // Verify page state after replay
      const pageState = await page.evaluate(() => window.getPageState())
      expect(pageState.isLoggedIn).toBe(true)
    })
  })

  describe('Case 3: LogicCompile → Persist LogicSpec', () => {
    it('should compile natural language rules into LogicSpec', async () => {
      // Create a workflow first
      const recordedSteps = [
        {
          action: 'goto',
          url: TEST_CONFIG.BASE_URL + '/test_fixture.html',
          metadata: { timestamp: Date.now(), intent: 'Navigate to test page' }
        },
        {
          action: 'type',
          selector: '#job-title',
          value: '{{jobTitle}}',
          metadata: { timestamp: Date.now(), intent: 'Enter job title' }
        },
        {
          action: 'click',
          selector: '#add-job-btn',
          metadata: { timestamp: Date.now(), intent: 'Add job' }
        }
      ]

      const createRequest = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Logic Compile Test Workflow',
          description: 'Test workflow for logic compilation',
          purposePrompt: 'Add jobs with logic rules',
          recordedSteps,
          requiresLogin: false
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const createResponse = await recordWorkflow(createRequest)
      const createData = await createResponse.json()
      testWorkflowId = createData.workflow.id

      // Define natural language rules
      const nlRules = `
        Skip processing if the job title is empty.
        Retry failed operations up to 3 times.
        For each job in the job list, execute the add job action.
        Wait 2 seconds between job additions.
      `

      const variables = [
        {
          name: 'jobTitle',
          type: 'string',
          description: 'Title of the job to add',
          required: true
        },
        {
          name: 'jobList',
          type: 'array',
          description: 'List of jobs to process',
          required: true
        }
      ]

      // Generate logic
      const generateRequest = new NextRequest(`http://localhost:3000/api/agents/${testWorkflowId}/generate-logic`, {
        method: 'POST',
        body: JSON.stringify({
          nlRules,
          variables
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const generateResponse = await generateLogic(generateRequest, { 
        params: Promise.resolve({ id: testWorkflowId }) 
      })
      const generateData = await generateResponse.json()

      expect(generateResponse.status).toBe(200)
      expect(generateData.success).toBe(true)
      expect(generateData.data.spec).toBeDefined()
      expect(generateData.data.spec.rules).toBeDefined()
      expect(generateData.data.spec.loops).toBeDefined()

      // Verify LogicSpec was persisted
      const workflow = await e2eTestDb.workflow.findUnique({
        where: { id: testWorkflowId }
      })

      expect(workflow?.logicSpec).toBeDefined()
      expect(workflow?.metadata?.nlRules).toBe(nlRules)
    })
  })

  describe('Case 4: Run → Execute Workflow with LogicSpec', () => {
    it('should execute workflow with rules and loops', async () => {
      // Create workflow with LogicSpec
      const recordedSteps = [
        {
          action: 'goto',
          url: TEST_CONFIG.BASE_URL + '/test_fixture.html',
          metadata: { timestamp: Date.now(), intent: 'Navigate to test page' }
        },
        {
          action: 'type',
          selector: '#username',
          value: 'testuser',
          metadata: { timestamp: Date.now(), intent: 'Enter username' }
        },
        {
          action: 'type',
          selector: '#password',
          value: 'testpass123',
          metadata: { timestamp: Date.now(), intent: 'Enter password' }
        },
        {
          action: 'click',
          selector: '#login-btn',
          metadata: { timestamp: Date.now(), intent: 'Click login button' }
        },
        {
          action: 'type',
          selector: '#job-title',
          value: '{{currentJob}}',
          metadata: { timestamp: Date.now(), intent: 'Enter job title' }
        },
        {
          action: 'click',
          selector: '#add-job-btn',
          metadata: { timestamp: Date.now(), intent: 'Add job' }
        }
      ]

      const createRequest = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Run Test Workflow',
          description: 'Test workflow for execution',
          purposePrompt: 'Login and add multiple jobs',
          recordedSteps,
          requiresLogin: true,
          loginConfig: TEST_CONFIG.TEST_LOGIN_CONFIG
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const createResponse = await recordWorkflow(createRequest)
      const createData = await createResponse.json()
      testWorkflowId = createData.workflow.id

      // Add LogicSpec with rules and loops
      const logicSpec = {
        id: 'test_logic_spec',
        name: 'Test Logic Spec',
        version: '1.0.0',
        actions: [],
        variables: [
          {
            name: 'jobList',
            type: 'array',
            description: 'List of jobs to process',
            required: true
          },
          {
            name: 'currentJob',
            type: 'string',
            description: 'Current job being processed',
            required: false
          }
        ],
        rules: [
          {
            id: 'skip_empty_rule',
            name: 'Skip Empty Jobs',
            condition: {
              variable: 'currentJob',
              operator: 'eq',
              value: ''
            },
            action: {
              type: 'skip_empty'
            },
            priority: 1,
            enabled: true
          }
        ],
        loops: [
          {
            id: 'job_loop',
            name: 'Process Jobs',
            variable: 'jobList',
            iterator: 'currentJob',
            actions: ['action_5', 'action_6'], // job-title and add-job-btn actions
            maxIterations: 10
          }
        ],
        settings: {
          timeout: 30000,
          retryAttempts: 3,
          screenshotOnError: true,
          debugMode: false,
          parallelExecution: false
        }
      }

      // Update workflow with LogicSpec
      await e2eTestDb.workflow.update({
        where: { id: testWorkflowId },
        data: { logicSpec }
      })

      // Execute workflow
      const runRequest = new NextRequest(`http://localhost:3000/api/agents/${testWorkflowId}/run`, {
        method: 'POST',
        body: JSON.stringify({
          variables: {
            jobList: ['Software Engineer', 'Data Scientist', 'Product Manager']
          },
          settings: {
            headless: true,
            timeout: 30000
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const runResponse = await runWorkflow(runRequest, { 
        params: Promise.resolve({ id: testWorkflowId }) 
      })
      const runData = await runResponse.json()

      expect(runResponse.status).toBe(200)
      expect(runData.success).toBe(true)
      expect(runData.data.status).toBe('success')
      expect(runData.data.steps).toBeDefined()
      expect(runData.data.evaluatedRules).toBeDefined()
      expect(runData.data.loopContexts).toBeDefined()

      testRunId = runData.data.runId

      // Verify workflow run was persisted
      const workflowRun = await e2eTestDb.workflowRun.findUnique({
        where: { id: testRunId },
        include: {
          steps: true
        }
      })

      expect(workflowRun).toBeDefined()
      expect(workflowRun?.status).toBe('COMPLETED')
      expect(workflowRun?.steps.length).toBeGreaterThan(0)

      // Verify loop context in step metadata
      const loopSteps = workflowRun?.steps.filter(step => 
        step.metadata && step.metadata.loopContext
      )
      expect(loopSteps?.length).toBeGreaterThan(0)
    })
  })

  describe('Case 5: Run History', () => {
    it('should retrieve run history and details', async () => {
      // First create and execute a workflow (reuse from previous test)
      const recordedSteps = [
        {
          action: 'goto',
          url: TEST_CONFIG.BASE_URL + '/test_fixture.html',
          metadata: { timestamp: Date.now(), intent: 'Navigate to test page' }
        },
        {
          action: 'type',
          selector: '#username',
          value: 'testuser',
          metadata: { timestamp: Date.now(), intent: 'Enter username' }
        },
        {
          action: 'click',
          selector: '#login-btn',
          metadata: { timestamp: Date.now(), intent: 'Click login button' }
        }
      ]

      const createRequest = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify({
          name: 'History Test Workflow',
          description: 'Test workflow for history functionality',
          purposePrompt: 'Test history functionality',
          recordedSteps,
          requiresLogin: false
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const createResponse = await recordWorkflow(createRequest)
      const createData = await createResponse.json()
      testWorkflowId = createData.workflow.id

      // Execute workflow to create run history
      const runRequest = new NextRequest(`http://localhost:3000/api/agents/${testWorkflowId}/run`, {
        method: 'POST',
        body: JSON.stringify({
          variables: {},
          settings: { headless: true }
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const runResponse = await runWorkflow(runRequest, { 
        params: Promise.resolve({ id: testWorkflowId }) 
      })
      const runData = await runResponse.json()
      testRunId = runData.data.runId

      // Get run history
      const historyRequest = new NextRequest(`http://localhost:3000/api/agents/${testWorkflowId}/runs`)
      const historyResponse = await getRuns(historyRequest, { 
        params: Promise.resolve({ id: testWorkflowId }) 
      })
      const historyData = await historyResponse.json()

      expect(historyResponse.status).toBe(200)
      expect(historyData.success).toBe(true)
      expect(historyData.data.runs).toBeDefined()
      expect(historyData.data.runs.length).toBeGreaterThan(0)

      const run = historyData.data.runs[0]
      expect(run.id).toBe(testRunId)
      expect(run.status).toBeDefined()
      expect(run.startedAt).toBeDefined()
      expect(run.finishedAt).toBeDefined()

      // Get run details
      const detailsRequest = new NextRequest(`http://localhost:3000/api/agents/${testWorkflowId}/runs/${testRunId}`)
      const detailsResponse = await getRunDetails(detailsRequest, { 
        params: Promise.resolve({ id: testWorkflowId, runId: testRunId }) 
      })
      const detailsData = await detailsResponse.json()

      expect(detailsResponse.status).toBe(200)
      expect(detailsData.success).toBe(true)
      expect(detailsData.data.run).toBeDefined()
      expect(detailsData.data.run.steps).toBeDefined()
      expect(detailsData.data.run.steps.length).toBeGreaterThan(0)

      // Verify step logs contain structured entries
      const step = detailsData.data.run.steps[0]
      expect(step.stepId).toBeDefined()
      expect(step.actionId).toBeDefined()
      expect(step.status).toBeDefined()
      expect(step.startTime).toBeDefined()
      expect(step.endTime).toBeDefined()
      expect(step.metadata).toBeDefined()

      // Verify no sensitive data in logs
      const logsString = JSON.stringify(detailsData.data.run)
      expect(logsString).not.toContain('testpass123')
      expect(logsString).not.toContain('password')
    })
  })

  describe('Schema Validation', () => {
    it('should validate all data structures with Zod schemas', async () => {
      // Test workflow creation validation
      const invalidRequest = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          name: '',
          recordedSteps: []
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await recordWorkflow(invalidRequest)
      expect(response.status).toBe(400)

      // Test logic generation validation
      const invalidLogicRequest = new NextRequest(`http://localhost:3000/api/agents/${testWorkflowId}/generate-logic`, {
        method: 'POST',
        body: JSON.stringify({
          nlRules: '', // Empty rules should fail
          variables: 'invalid' // Invalid variables format
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const logicResponse = await generateLogic(invalidLogicRequest, { 
        params: Promise.resolve({ id: testWorkflowId }) 
      })
      expect(logicResponse.status).toBe(400)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully throughout the pipeline', async () => {
      // Test with invalid workflow ID
      const invalidRunRequest = new NextRequest('http://localhost:3000/api/agents/invalid-id/run', {
        method: 'POST',
        body: JSON.stringify({
          variables: {},
          settings: { headless: true }
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const runResponse = await runWorkflow(invalidRunRequest, { 
        params: Promise.resolve({ id: 'invalid-id' }) 
      })
      expect(runResponse.status).toBe(404)

      // Test with invalid run ID
      const invalidDetailsRequest = new NextRequest('http://localhost:3000/api/agents/test-workflow/runs/invalid-run-id')
      const detailsResponse = await getRunDetails(invalidDetailsRequest, { 
        params: Promise.resolve({ id: 'test-workflow', runId: 'invalid-run-id' }) 
      })
      expect(detailsResponse.status).toBe(404)
    })
  })

  describe('Deterministic Testing', () => {
    it('should produce consistent results across multiple runs', async () => {
      const recordedSteps = [
        {
          action: 'goto',
          url: TEST_CONFIG.BASE_URL + '/test_fixture.html',
          metadata: { timestamp: Date.now(), intent: 'Navigate to test page' }
        },
        {
          action: 'type',
          selector: '#username',
          value: 'testuser',
          metadata: { timestamp: Date.now(), intent: 'Enter username' }
        }
      ]

      // Create workflow
      const createRequest = new NextRequest('http://localhost:3000/api/agents/record', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Deterministic Test Workflow',
          description: 'Test workflow for deterministic results',
          purposePrompt: 'Test deterministic behavior',
          recordedSteps,
          requiresLogin: false
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const createResponse = await recordWorkflow(createRequest)
      const createData = await createResponse.json()
      const workflowId = createData.workflow.id

      // Execute workflow multiple times
      const results = []
      for (let i = 0; i < 3; i++) {
        const runRequest = new NextRequest(`http://localhost:3000/api/agents/${workflowId}/run`, {
          method: 'POST',
          body: JSON.stringify({
            variables: {},
            settings: { headless: true }
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const runResponse = await runWorkflow(runRequest, { 
          params: Promise.resolve({ id: workflowId }) 
        })
        const runData = await runResponse.json()
        results.push(runData.data.status)
      }

      // All runs should have the same status
      expect(results.every(status => status === results[0])).toBe(true)
    })
  })
})
