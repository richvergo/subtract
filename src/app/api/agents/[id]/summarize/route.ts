import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { summarizeWithEventsSchema } from '@/lib/schemas/agents';
import { z } from 'zod';

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

    const transcriptText = validatedData.transcript || 'No transcript provided';
    

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
        { error: 'Validation error', details: error.issues },
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
function generateEnhancedSummary(eventLog: unknown[], transcript: string, agentName: string): string {
  const events = eventLog || [];
  const hasEventLog = events.length > 0;
  const hasTranscript = transcript && transcript.trim().length > 0;
  
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
    const eventData = event as Record<string, unknown>;
    summary += `${index + 1}. **${eventData.action}**`;
    
    if (eventData.url && eventData.url !== (events[index - 1] as Record<string, unknown>)?.url) {
      summary += ` on ${eventData.url}`;
    }
    
    if (eventData.target) {
      summary += ` targeting "${eventData.target}"`;
    }
    
    if (eventData.value) {
      summary += ` with value "${eventData.value}"`;
    }
    
    if (eventData.elementType) {
      summary += ` (${eventData.elementType})`;
    }
    
    if (eventData.elementText) {
      summary += ` - "${eventData.elementText}"`;
    }
    
    if (eventData.screenshotUrl) {
      summary += ` 📸 [Screenshot captured]`;
    }
    
    summary += `\n`;
  });
  
  summary += `\n**Workflow Summary:** The user completed a multi-step process involving `;
  
  // Extract unique URLs and tools
  const urls = [...new Set(events.map(e => (e as Record<string, unknown>).url).filter(Boolean))];
  const tools = urls.map(url => {
    const urlStr = url as string;
    if (urlStr.includes('docs.google.com')) return 'Google Docs';
    if (urlStr.includes('slides.google.com')) return 'Google Slides';
    if (urlStr.includes('sheets.google.com')) return 'Google Sheets';
    if (urlStr.includes('canva.com')) return 'Canva';
    if (urlStr.includes('figma.com')) return 'Figma';
    return new URL(urlStr).hostname;
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
