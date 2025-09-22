import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { getUserEmailForQuery } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/agents/[id]/recording - Get agent recording for playback/download
 * Returns the video file if recordingUrl exists and user has access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Await params
    const { id: agentId } = await params;

    // Verify agent ownership and get recording URL
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        ownerId: user.id,
      },
      select: {
        id: true,
        name: true,
        recordingUrl: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (!agent.recordingUrl) {
      return NextResponse.json(
        { error: 'No recording found for this agent' },
        { status: 404 }
      );
    }

    // Construct file path
    const filePath = join(process.cwd(), agent.recordingUrl);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`Recording file not found: ${filePath}`);
      return NextResponse.json(
        { error: 'Recording file not found' },
        { status: 404 }
      );
    }

    try {
      // Read file
      const fileBuffer = await readFile(filePath);
      
      // Determine content type based on file extension
      const contentType = agent.recordingUrl.endsWith('.webm') 
        ? 'video/webm' 
        : agent.recordingUrl.endsWith('.mp4') 
        ? 'video/mp4' 
        : 'application/octet-stream';

      // Return file with appropriate headers
      return new NextResponse(fileBuffer as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Content-Disposition': `inline; filename="${agent.name}_recording.${agent.recordingUrl.split('.').pop()}"`,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });

    } catch (error) {
      console.error('Failed to read recording file:', error);
      return NextResponse.json(
        { error: 'Failed to read recording file' },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error('[agents/recording] Error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
