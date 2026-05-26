export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs';

const tempDir = os.tmpdir();
const errorFilePath = path.join(tempDir, 'n8n-latest-error.json');

// Helper to read the error
function readError() {
  try {
    if (fs.existsSync(errorFilePath)) {
      const content = fs.readFileSync(errorFilePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading JSON file:', err);
  }
  return { message: null };
}

// Helper to write the error
function writeError(message: string | null) {
  try {
    fs.writeFileSync(errorFilePath, JSON.stringify({ message, timestamp: Date.now() }), 'utf-8');
  } catch (err) {
    console.error('Error writing JSON file:', err);
  }
}

// GET /api/notifications/error
export async function GET() {
  const data = readError();
  return NextResponse.json(data);
}

// POST /api/notifications/error
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message || body?.Error || body?.error || null;
    writeError(message);
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Failed to save notification' }, { status: 500 });
  }
}

// DELETE /api/notifications/error
export async function DELETE() {
  writeError(null);
  return NextResponse.json({ success: true });
}
