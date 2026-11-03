import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/middleware/auth'
import { listClasses } from '@/server/services/classes.service'

/** GET /api/classes: list classes with their homeroom teacher (admin and teachers). */
export async function handleListClasses(req: NextRequest): Promise<NextResponse> {
  await requireRole(req, 'ADMIN', 'TEACHER')
  return NextResponse.json(await listClasses())
}