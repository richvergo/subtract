import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: workflowId, sessionId } = await params

    console.log(`Fetching session for workflowId: ${workflowId}, sessionId: ${sessionId}`)

    // First try to get session from active recordings
    try {
      const baseUrl = `http://localhost:${process.env.PORT || 3000}`
      const recordingsResponse = await fetch(`${baseUrl}/api/recordings/unified?sessionId=${sessionId}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (recordingsResponse.ok) {
        const recordingsData = await recordingsResponse.json()
        console.log('Found active session:', recordingsData)
        
        // Extract the actual session data from the recordings response
        if (recordingsData.success && recordingsData.session) {
          const sessionData = {
            sessionId: recordingsData.session.sessionId,
            workflowId: recordingsData.session.workflowId,
            isActive: recordingsData.isRecording || false,
            actions: recordingsData.session.actions || [],
            metadata: recordingsData.session.metadata || {}
          }
          console.log('Returning processed session data:', sessionData)
          return NextResponse.json(sessionData)
        } else {
          console.log('Invalid recordings response format:', recordingsData)
        }
      }
    } catch (error) {
      console.log('No active session found, checking database...', error)
    }

    // Fallback to database
    const workflowActions = await prisma.workflowAction.findMany({
      where: { workflowId },
      orderBy: { order: 'asc' }
    })

    console.log(`Found ${workflowActions.length} workflow actions in database`)

    if (workflowActions.length === 0) {
      // Return empty session data instead of 404
      const sessionData = {
        sessionId,
        workflowId,
        isActive: false,
        actions: [],
        metadata: {
          startTime: Date.now() - 60000, // 1 minute ago
          endTime: Date.now()
        }
      }
      console.log('No actions found, returning empty session data')
      return NextResponse.json(sessionData)
    }

    // Transform database actions to session format
    const actions = workflowActions.map(dbAction => ({
      id: dbAction.id,
      type: (dbAction.action as any)?.type || 'unknown',
      selector: (dbAction.action as any)?.selector || 'body',
      value: (dbAction.action as any)?.value || '',
      order: dbAction.order,
      timestamp: (dbAction.action as any)?.timestamp || Date.now(),
      metadata: {
        ...(dbAction.action as any)?.metadata || {},
        screenshot: dbAction.screenshotUrl ? dbAction.screenshotUrl.split(',')[1] : undefined, // Extract base64 data
        coordinates: (dbAction.action as any)?.coordinates,
        url: (dbAction.action as any)?.url
      }
    }))

    const sessionData = {
      sessionId,
      workflowId,
      isActive: false, // Database sessions are completed
      actions,
      metadata: {
        startTime: (workflowActions[0]?.action as any)?.timestamp || Date.now(),
        endTime: (workflowActions[workflowActions.length - 1]?.action as any)?.timestamp || Date.now()
      }
    }

    console.log('Returning session data from database:', sessionData)
    return NextResponse.json(sessionData)

  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({
      error: 'Failed to fetch session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}