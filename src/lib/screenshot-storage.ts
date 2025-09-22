import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Configuration constants
const MAX_SCREENSHOT_SIZE = 200 * 1024; // 200KB
const ALLOWED_SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const EVENTS_UPLOADS_DIR = join(process.cwd(), 'uploads', 'events');

export interface ScreenshotData {
  base64: string;
  mimeType: string;
}

export interface StoredScreenshot {
  url: string;
  filename: string;
}

/**
 * Validates screenshot data
 */
export function validateScreenshot(base64: string, mimeType: string): { valid: boolean; error?: string } {
  // Check MIME type
  if (!ALLOWED_SCREENSHOT_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid screenshot type. Allowed types: ${ALLOWED_SCREENSHOT_TYPES.join(', ')}`
    };
  }

  // Check file size (approximate from base64)
  const base64Size = base64.length * 0.75; // Base64 is ~33% larger than binary
  if (base64Size > MAX_SCREENSHOT_SIZE) {
    return {
      valid: false,
      error: `Screenshot too large. Maximum size is ${MAX_SCREENSHOT_SIZE / 1024}KB`
    };
  }

  return { valid: true };
}

/**
 * Sanitizes filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\./, '') // Remove leading dot
    .substring(0, 255); // Limit length
}

/**
 * Stores a base64 screenshot to disk and returns the URL
 */
export async function storeScreenshot(
  agentId: string,
  step: number,
  screenshotData: ScreenshotData
): Promise<StoredScreenshot> {
  // Validate screenshot
  const validation = validateScreenshot(screenshotData.base64, screenshotData.mimeType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Ensure uploads directory exists
  if (!existsSync(EVENTS_UPLOADS_DIR)) {
    await mkdir(EVENTS_UPLOADS_DIR, { recursive: true });
  }

  // Generate filename
  const timestamp = Date.now();
  const extension = screenshotData.mimeType === 'image/png' ? 'png' : 'jpg';
  const filename = sanitizeFilename(`${agentId}_${step}_${timestamp}.${extension}`);
  const filePath = join(EVENTS_UPLOADS_DIR, filename);

  // Convert base64 to buffer and save
  const buffer = Buffer.from(screenshotData.base64, 'base64');
  await writeFile(filePath, buffer);

  return {
    url: `/uploads/events/${filename}`,
    filename
  };
}

/**
 * Processes inline screenshots in event log and stores them
 */
export async function processInlineScreenshots(
  agentId: string,
  eventLog: unknown[]
): Promise<unknown[]> {
  const processedEvents = [];

  for (const event of eventLog) {
    const processedEvent = event && typeof event === 'object' ? { ...event } : {};

    // If event has inline screenshot, store it
    const eventObj = event as Record<string, unknown>;
    if (eventObj.screenshot && typeof eventObj.screenshot === 'string') {
      try {
        // Assume base64 data URL format: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
        const [header, base64] = (eventObj.screenshot as string).split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1];

        if (mimeType && base64) {
          const stored = await storeScreenshot(agentId, (eventObj.step as number), {
            base64,
            mimeType
          });
          (processedEvent as Record<string, unknown>).screenshotUrl = stored.url;
          delete (processedEvent as Record<string, unknown>).screenshot; // Remove inline data
        }
      } catch (error) {
        console.error('Failed to store screenshot:', error);
        // Continue without screenshot rather than failing the entire request
        delete (processedEvent as Record<string, unknown>).screenshot;
      }
    }

    processedEvents.push(processedEvent);
  }

  return processedEvents;
}
