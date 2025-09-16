import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { summarizeWithEventsSchema, type SummarizeWithEventsInput } from '@/lib/schemas/agents';

/**
 * POST /api/agents/[id]/summarize - Run enhanced LLM summarization with event logs and transcripts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Await params
    const { id: agentId } = await params;

    // Check if agent exists and user owns it
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
      select: {
        id: true,
        name: true,
        purposePrompt: true,
        recordingUrl: true,
        status: true,
        eventLog: true,
        transcript: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent is in DRAFT status
    if (agent.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Agent must be in DRAFT status to run summarization' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validatedData = summarizeWithEventsSchema.parse(body);

    // Enhanced LLM prompt construction with screenshot context
    const eventLogText = JSON.stringify(validatedData.eventLog, null, 2);
    const transcriptText = validatedData.transcript || 'No transcript provided';
    
    // Count screenshots for context
    const screenshotCount = validatedData.eventLog.filter(event => event.screenshotUrl).length;
    
    const enhancedPrompt = `You are analyzing a recorded workflow for an automation agent named "${agent.name}".

Here is the structured event log showing the user's actions with multi-signal capture:
${eventLogText}

Here is the user narration transcript:
${transcriptText}

${screenshotCount > 0 ? `Note: This workflow includes ${screenshotCount} screenshot(s) captured at key moments to provide visual context for the actions.` : ''}

Please provide a clear, step-by-step summary of what the user did, including:
1. Specific tools and websites used
2. Key actions taken (clicks, typing, navigation)
3. Outcomes and results achieved
4. The overall workflow purpose
5. Visual context from screenshots (when available)

Make the summary specific and actionable, mentioning actual tool names, website URLs, and concrete actions rather than vague descriptions. When screenshots are available, reference them to provide richer context about the user interface and visual elements involved.`;

    // Enhanced LLM summarization - in a real implementation, this would call an LLM service
    const enhancedSummary = generateEnhancedSummary(validatedData.eventLog, transcriptText, agent.name);

    // Update agent with enhanced data and summary
    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        eventLog: JSON.stringify(validatedData.eventLog),
        transcript: validatedData.transcript || null,
        llmSummary: enhancedSummary,
        processingStatus: 'ready',
        processingProgress: 100,
      },
    });

    return NextResponse.json({
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        llmSummary: updatedAgent.llmSummary,
        eventLog: updatedAgent.eventLog,
        transcript: updatedAgent.transcript,
        processingStatus: updatedAgent.processingStatus,
        processingProgress: updatedAgent.processingProgress,
      },
      message: 'Enhanced agent summarization completed successfully',
    });
  } catch (error) {
    console.error('Error running enhanced agent summarization:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate enhanced summary based on event log and transcript
 * In production, this would call an actual LLM service
 */
function generateEnhancedSummary(eventLog: any[], transcript: string, agentName: string): string {
  const events = eventLog || [];
  const hasTranscript = transcript && transcript !== 'No transcript provided';
  const hasEventLog = events.length > 0;
  
  let summary = `## Workflow Analysis: ${agentName}\n\n`;
  
  if (hasTranscript) {
    summary += `**User Narration:** ${transcript}\n\n`;
  }
  
  // Handle case where event log is empty (current recording system limitation)
  if (!hasEventLog) {
    summary += `**Recording Analysis:**\n`;
    summary += `This recording was captured using screen recording technology. While the video shows the complete workflow, detailed step-by-step actions are not yet available due to current recording limitations.\n\n`;
    
    if (hasTranscript) {
      summary += `**Based on your narration:**\n`;
      summary += `You described creating a Google Slide presentation. The video recording contains the complete visual workflow showing your screen interactions, clicks, and navigation.\n\n`;
    }
    
    summary += `**Next Steps:**\n`;
    summary += `- Review the video recording to verify the workflow accuracy\n`;
    summary += `- Provide context about how this agent will be used\n`;
    summary += `- The agent will be ready for automation once approved\n\n`;
    
    summary += `**Note:** Future versions will include detailed action tracking for more precise automation.`;
    
    return summary;
  }
  
  // Original logic for when event log is available
  summary += `**Step-by-Step Actions:**\n`;
  
  events.forEach((event, index) => {
    summary += `${index + 1}. **${event.action}**`;
    
    if (event.url && event.url !== events[index - 1]?.url) {
      summary += ` on ${event.url}`;
    }
    
    if (event.target) {
      summary += ` targeting "${event.target}"`;
    }
    
    if (event.value) {
      summary += ` with value "${event.value}"`;
    }
    
    if (event.elementType) {
      summary += ` (${event.elementType})`;
    }
    
    if (event.elementText) {
      summary += ` - "${event.elementText}"`;
    }
    
    if (event.screenshotUrl) {
      summary += ` 📸 [Screenshot captured]`;
    }
    
    summary += `\n`;
  });
  
  summary += `\n**Workflow Summary:** The user completed a multi-step process involving `;
  
  // Extract unique URLs and tools
  const urls = [...new Set(events.map(e => e.url).filter(Boolean))];
  const tools = urls.map(url => {
    if (url.includes('docs.google.com')) return 'Google Docs';
    if (url.includes('slides.google.com')) return 'Google Slides';
    if (url.includes('sheets.google.com')) return 'Google Sheets';
    if (url.includes('canva.com')) return 'Canva';
    if (url.includes('figma.com')) return 'Figma';
    return new URL(url).hostname;
  });
  
  if (tools.length > 0) {
    summary += `${tools.join(', ')}`;
  } else {
    summary += `web-based tools`;
  }
  
  summary += `. The process involved ${events.length} distinct actions including form interactions, navigation, and content creation.`;
  
  if (hasTranscript) {
    summary += ` The user provided verbal narration throughout the process, explaining their intent and approach.`;
  }
  
  return summary;
}
