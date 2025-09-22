import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { recordWorkflowWithEventsSchema } from '@/lib/schemas/agents';
import { getUserEmailForQuery } from '@/lib/auth';
import { processInlineScreenshots } from '@/lib/screenshot-storage';

/**
 * POST /api/agents/record-events - Record workflow with enriched event logs and screenshots
 * Accepts JSON payload with eventLog containing multi-signal capture data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const userEmail = getUserEmailForQuery(session);
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = recordWorkflowWithEventsSchema.parse(body);

    // Process inline screenshots and store them
    let processedEventLog = validatedData.eventLog;
    if (processedEventLog && processedEventLog.length > 0) {
      // Create a temporary agent to get an ID for screenshot storage
      const tempAgent = await db.agent.create({
        data: {
          name: validatedData.name,
          description: validatedData.description || 'Agent with enriched event logs',
          purposePrompt: validatedData.purposePrompt,
          agentConfig: JSON.stringify([]),
          agentIntents: JSON.stringify([]),
          ownerId: user.id,
        },
      });

      try {
        // Process screenshots in the event log
        processedEventLog = await processInlineScreenshots(tempAgent.id, processedEventLog as unknown[]) as typeof processedEventLog;
      } catch (error) {
        console.error('Failed to process screenshots:', error);
        // Continue without screenshots rather than failing
      }

      // Store events in the Event table for scalability
      const events = processedEventLog.map(event => ({
        agentId: tempAgent.id,
        step: event.step,
        action: event.action,
        target: event.target,
        value: event.value,
        url: event.url,
        elementType: event.elementType,
        elementText: event.elementText,
        screenshotUrl: event.screenshotUrl,
      }));

      await db.event.createMany({
        data: events,
      });

      // Update agent with processed event log and transcript
      await db.agent.update({
        where: { id: tempAgent.id },
        data: {
          eventLog: JSON.stringify(processedEventLog),
          transcript: validatedData.transcript,
        },
      });

      // Link agent to logins if provided
      if (validatedData.loginIds && validatedData.loginIds.length > 0) {
        const agentLogins = validatedData.loginIds.map(loginId => ({
          agentId: tempAgent.id,
          loginId,
        }));

        await db.agentLogin.createMany({
          data: agentLogins,
        });
      }

      // Fetch the complete agent with relations
      const agent = await db.agent.findUnique({
        where: { id: tempAgent.id },
        include: {
          agentLogins: {
            include: {
              login: {
                select: {
                  id: true,
                  name: true,
                  loginUrl: true,
                },
              },
            },
          },
          events: {
            orderBy: { step: 'asc' },
          },
        },
      });

      if (!agent) {
        throw new Error('Failed to fetch created agent');
      }

      // Transform the response
      const transformedAgent = {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        ownerId: agent.ownerId,
        agentConfig: agent.agentConfig ? JSON.parse(agent.agentConfig) : [],
        purposePrompt: agent.purposePrompt,
        agentIntents: agent.agentIntents ? JSON.parse(agent.agentIntents) : [],
        eventLog: agent.eventLog,
        transcript: agent.transcript,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        logins: agent.agentLogins.map((al) => ({
          id: al.login.id,
          name: al.login.name,
          loginUrl: al.login.loginUrl,
        })),
        events: agent.events.map(event => ({
          id: event.id,
          step: event.step,
          action: event.action,
          target: event.target,
          value: event.value,
          url: event.url,
          elementType: event.elementType,
          elementText: event.elementText,
          screenshotUrl: event.screenshotUrl,
          createdAt: event.createdAt,
        })),
      };

      return NextResponse.json({ 
        agent: transformedAgent,
        message: 'Agent created with enriched event logs successfully'
      }, { status: 201 });

    } else {
      // Fallback to simple agent creation without event logs
      const agent = await db.agent.create({
        data: {
          name: validatedData.name,
          description: validatedData.description || 'Agent created without event logs',
          purposePrompt: validatedData.purposePrompt,
          agentConfig: JSON.stringify([]),
          agentIntents: JSON.stringify([]),
          transcript: validatedData.transcript,
          ownerId: user.id,
        },
      });

      return NextResponse.json({ 
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          purposePrompt: agent.purposePrompt,
          transcript: agent.transcript,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
        },
        message: 'Agent created successfully'
      }, { status: 201 });
    }

  } catch (error: unknown) {
    console.error('[agents/record-events] Error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined,
    });

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as unknown as { errors: unknown }).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
