import { NextResponse } from 'next/server'

/** GET /api — health check. */
export function GET() {
  return NextResponse.json({ status: 'ok', app: 'Greenfield Academy — School Management System' })
}
