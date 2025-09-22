import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { llmService } from '@/lib/llm-service';

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

    const { id: loginId } = await params;

    // Get the login record
    const login = await db.login.findUnique({
      where: { id: loginId },
      include: { owner: true }
    });

    if (!login) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    // Check if user owns this login
    if (login.owner.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if login has a recording
    if (!login.recordingUrl) {
      return NextResponse.json(
        { error: 'No recording found for this login' },
        { status: 400 }
      );
    }

    // Check if already analyzed
    if (login.analysisStatus === 'completed') {
      return NextResponse.json({
        message: 'Analysis already completed',
        analysisStatus: 'completed',
        customConfig: login.customConfig
      });
    }

    // Update status to processing
    await db.login.update({
      where: { id: loginId },
      data: { analysisStatus: 'processing' }
    });

    console.log(`Starting analysis for login ${loginId}...`);

    try {
      // Analyze the recording using LLM service
      const analysisResult = await llmService.analyzeLoginRecording({
        loginUrl: login.loginUrl,
        name: login.name
      });

      // Update login with analysis results
      await db.login.update({
        where: { id: loginId },
        data: {
          analysisStatus: 'completed',
          customConfig: JSON.stringify(analysisResult),
          updatedAt: new Date()
        }
      });

      console.log(`Analysis completed for login ${loginId}`);

      return NextResponse.json({
        message: 'Analysis completed successfully',
        analysisStatus: 'completed',
        customConfig: analysisResult
      });

    } catch (analysisError) {
      console.error(`Analysis failed for login ${loginId}:`, analysisError);
      
      // Update status to failed
      await db.login.update({
        where: { id: loginId },
        data: { 
          analysisStatus: 'failed',
          errorMessage: analysisError instanceof Error ? analysisError.message : 'Analysis failed'
        }
      });

      return NextResponse.json({
        error: 'Analysis failed',
        analysisStatus: 'failed',
        message: analysisError instanceof Error ? analysisError.message : 'Analysis failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in analyze endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check analysis status
export async function GET(
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

    const { id: loginId } = await params;

    const login = await db.login.findUnique({
      where: { id: loginId },
      select: {
        id: true,
        analysisStatus: true,
        customConfig: true,
        errorMessage: true,
        owner: { select: { email: true } }
      }
    });

    if (!login) {
      return NextResponse.json(
        { error: 'Login not found' },
        { status: 404 }
      );
    }

    if (login.owner.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: login.id,
      analysisStatus: login.analysisStatus,
      customConfig: login.customConfig ? JSON.parse(login.customConfig) : null,
      errorMessage: login.errorMessage
    });

  } catch (error) {
    console.error('Error checking analysis status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
