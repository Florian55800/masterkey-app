import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const UPLOADS_DIR =
  process.env.NODE_ENV === 'production'
    ? '/app/public/uploads'
    : join(process.cwd(), 'public', 'uploads')

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  pdf: 'application/pdf',
}

export async function GET(
  _: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = join(UPLOADS_DIR, ...params.path)
    // Prevent path traversal
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return new NextResponse(null, { status: 403 })
    }
    const ext = params.path[params.path.length - 1]?.split('.').pop()?.toLowerCase() ?? ''
    const contentType = MIME[ext] ?? 'application/octet-stream'
    const data = await readFile(filePath)
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
