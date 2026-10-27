import { NextResponse } from 'next/server'

/** GET /api — health check. */
export function GET() {
  return NextResponse.json({ status: 'ok', app: 'Nejo preparatory School Academy — School Management System' })
}
