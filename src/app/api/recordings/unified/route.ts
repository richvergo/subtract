import { NextRequest, NextResponse } from 'next/server'
import { PuppeteerCaptureService, CaptureConfig } from '@/lib/agents/capture/PuppeteerCaptureService'
import { prisma } from '@/lib/db'
import { launchPuppeteer, PuppeteerPresets } from '@/lib/puppeteer-config'

// Session management constants
const MAX_CONCURRENT_SESSIONS = 5
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// Store active Puppeteer recording sessions with browser instances and metadata
const activeSessions = new Map<string, {
  captureService: PuppeteerCaptureService
  browser: any
  page: any
  createdAt: number
  workflowId: string
}>()

// Cleanup function to remove stale sessions
async function cleanupStaleSessions() {
  const now = Date.now()
  const staleSessionIds: string[] = []
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT_MS) {
      staleSessionIds.push(sessionId)
    }
  }
  
  for (const sessionId of staleSessionIds) {
    console.log(`🧹 Cleaning up stale session: ${sessionId}`)
    await cleanupSession(sessionId)
  }
}

// Helper function to cleanup a single session
async function cleanupSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId)
  if (session) {
    try {
      await session.captureService.cleanup()
      if (session.browser && !session.browser.isClosed()) {
        await session.browser.close()
      }
    } catch (error) {
      console.error(`Failed to cleanup session ${sessionId}:`, error)
    }
    activeSessions.delete(sessionId)
  }
}

// Helper function to enforce session limits
async function enforceSessionLimits(): Promise<void> {
  if (activeSessions.size >= MAX_CONCURRENT_SESSIONS) {
    // Clean up stale sessions first
    await cleanupStaleSessions()
    
    // If still over limit, remove oldest session
    if (activeSessions.size >= MAX_CONCURRENT_SESSIONS) {
      let oldestSessionId = ''
      let oldestTime = Date.now()
      
      for (const [sessionId, session] of activeSessions.entries()) {
        if (session.createdAt < oldestTime) {
          oldestTime = session.createdAt
          oldestSessionId = sessionId
        }
      }
      
      if (oldestSessionId) {
        console.log(`🚫 Removing oldest session to enforce limits: ${oldestSessionId}`)
        await cleanupSession(oldestSessionId)
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workflowId, url, config } = await request.json()
    
    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 })
    }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Enforce session limits before creating new session
    await enforceSessionLimits()

    // Create enhanced Puppeteer configuration for visible browser
    const captureConfig: CaptureConfig = {
      // Pure Puppeteer settings
      showBrowser: true, // Show visible browser
      browserViewport: { width: 1920, height: 1080 },
      allowUserInteraction: true, // Let user interact
      autoClose: false, // Keep browser open for user
      
      // Existing settings
      includeScreenshots: true,
      captureFrequency: 1000,
      selectorStrategy: 'hybrid',
      includeNetworkRequests: true,
      includeConsoleLogs: true,
      timeout: 30000,
      ...config
    }

    // Launch visible Puppeteer browser with robust configuration
    let browser
    try {
      browser = await launchPuppeteer({
        ...PuppeteerPresets.development,
        showBrowser: true,
        viewport: captureConfig.browserViewport
      })
    } catch (error) {
      console.error('Failed to launch Puppeteer browser:', error)
      return NextResponse.json(
        { error: `Browser launch failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
        { status: 500 }
      )
    }

    const page = await browser.newPage()
    
    // Create or get workflow first
    let workflow
    try {
      workflow = await prisma.workflow.findUnique({
        where: { id: workflowId }
      })
      
      if (!workflow) {
        // Create a new workflow if it doesn't exist
        workflow = await prisma.workflow.create({
          data: {
            id: workflowId,
            name: `Workflow ${workflowId}`,
            description: 'Auto-generated workflow',
            status: 'DRAFT',
            logicSpec: {}, // Empty logic spec for now
            metadata: {
              targetUrl: url,
              createdAt: new Date().toISOString()
            }
          }
        })
        console.log(`Created new workflow: ${workflowId}`)
      }
    } catch (error) {
      console.error('Failed to create/get workflow:', error)
      // Clean up browser on error
      try {
        await browser.close()
      } catch (cleanupError) {
        console.error('Failed to cleanup browser after workflow error:', cleanupError)
      }
      return NextResponse.json(
        { error: `Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
        { status: 500 }
      )
    }

    // Create capture service
    const captureService = new PuppeteerCaptureService(captureConfig)
    const sessionId = `puppeteer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Start capture
    try {
      await captureService.startCapture(workflowId, url)
    } catch (error) {
      console.error('Failed to start capture:', error)
      // Clean up browser on error
      try {
        await browser.close()
      } catch (cleanupError) {
        console.error('Failed to cleanup browser after capture error:', cleanupError)
      }
      return NextResponse.json(
        { error: `Failed to start capture: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
        { status: 500 }
      )
    }
    
    // Store session in database for persistence
    try {
      await prisma.workflowRun.create({
        data: {
          id: sessionId,
          workflowId: workflowId,
          status: 'RUNNING',
          startedAt: new Date(),
          metadata: {
            sessionId: sessionId,
            targetUrl: url,
            config: captureConfig as any,
            isActive: true
          }
        }
      })
      console.log(`Stored session ${sessionId} in database`)
    } catch (error) {
      console.error('Failed to store session in database:', error)
      // Continue even if database storage fails
    }
    
    // Store session with browser instance and metadata
    activeSessions.set(sessionId, {
      captureService,
      // browser,
      page,
      createdAt: Date.now(),
      workflowId
    })

    console.log(`✅ Created session ${sessionId} (${activeSessions.size}/${MAX_CONCURRENT_SESSIONS} sessions active)`)

    return NextResponse.json({ 
      success: true, 
      sessionId,
      workflowId,
      message: 'Puppeteer browser window opened for recording'
    })

  } catch (error) {
    console.error('Failed to start Puppeteer recording:', error)
    return NextResponse.json(
      { error: `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Stop Puppeteer capture service and close browser
    const activeSession = activeSessions.get(sessionId)
    if (activeSession) {
      const { captureService, browser } = activeSession
      
      // Stop capture
      const actions = await captureService.stopCapture()
      
      // Persist session data to database before removing from memory
      try {
        const sessionData = captureService.getSession()
        if (sessionData && sessionData.workflowId) {
          // Save actions to the workflow
          for (const action of actions) {
            console.log(`💾 Saving action to database:`, {
              actionId: action.id,
              workflowId: sessionData.workflowId,
              actionType: action.type,
              selector: action.selector
            })
            
            await prisma.workflowAction.create({
              data: {
                // Remove custom id - let Prisma generate it
                workflowId: sessionData.workflowId,
                action: action as any, // Store the entire action as JSONB
                order: (action as any).order || 0,
                screenshotUrl: (action as any).screenshotUrl,
                selectorBox: (action as any).selectorBox,
                annotations: (action as any).annotations
              }
            })
            
            console.log(`✅ Successfully saved action ${action.id} to database`)
          }
          console.log(`✅ Persisted ${actions.length} actions to database for workflow ${sessionData.workflowId}`)
        }
      } catch (error) {
        console.error('Failed to persist session data:', error)
      }
      
      // Clean up session resources
      await cleanupSession(sessionId)
      
      console.log(`✅ Cleaned up session ${sessionId} (${activeSessions.size}/${MAX_CONCURRENT_SESSIONS} sessions remaining)`)
      
      return NextResponse.json({ 
        success: true, 
        actions,
        message: 'Puppeteer recording stopped and browser closed' 
      })
    } else {
      return NextResponse.json({ error: 'Recording session not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('Failed to stop Puppeteer recording:', error)
    return NextResponse.json(
      { error: `Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    console.log(`Getting recording status for sessionId: ${sessionId}`)
    console.log(`Active sessions: ${Array.from(activeSessions.keys()).join(', ')}`)

    // Clean up stale sessions first
    await cleanupStaleSessions()

    // Get Puppeteer recording status
    const activeSession = activeSessions.get(sessionId)
    if (activeSession) {
      const { captureService } = activeSession
      const captureSession = captureService.getSession()
      console.log('Found active session:', captureSession)
      return NextResponse.json({ 
        success: true, 
        session: captureSession,
        isRecording: captureService.isActive()
      })
    } else {
      console.log(`No active session found for sessionId: ${sessionId}`)
      return NextResponse.json({ error: 'Recording session not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('Failed to get Puppeteer recording status:', error)
    return NextResponse.json(
      { error: `Failed to get recording status: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    )
  }
}
