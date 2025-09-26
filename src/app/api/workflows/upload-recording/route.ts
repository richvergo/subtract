import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Validation schema for upload request
const UploadRecordingSchema = z.object({
  workflowId: z.string().min(1),
  video: z.instanceof(File)
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const workflowId = formData.get('workflowId') as string
    const video = formData.get('video') as File

    // Validate request
    const validatedData = UploadRecordingSchema.parse({
      workflowId,
      video
    })

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (video.size > maxSize) {
      return NextResponse.json(
        { error: 'Video file too large. Maximum size is 50MB.' },
        { status: 413 }
      )
    }

    // Check file type
    if (!video.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video files are allowed.' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'workflows', validatedData.workflowId)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `recording_${timestamp}.webm`
    const filepath = join(uploadsDir, filename)

    // Save file
    const buffer = Buffer.from(await video.arrayBuffer())
    await writeFile(filepath, buffer)

    // Generate public URL
    const videoUrl = `/uploads/workflows/${validatedData.workflowId}/${filename}`

    console.log(`📹 Video uploaded successfully: ${videoUrl}`)

    return NextResponse.json({
      success: true,
      videoUrl,
      fileSize: video.size,
      filename
    })

  } catch (error) {
    console.error('Failed to upload recording:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload recording' },
      { status: 500 }
    )
  }
}
