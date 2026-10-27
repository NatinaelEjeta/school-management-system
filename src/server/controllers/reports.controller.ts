import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/server/middleware/auth'
import { parseIdParam } from '@/server/http'
import { getReportCard } from '@/server/services/reports.service'
import type { ReportCard } from '@/types/school'

/**
 * GET /api/reports/:studentId — full report card data.
 * Access: ADMIN, or the student requesting their own report.
 */
export async function handleReportCard(req: NextRequest, rawStudentId: string): Promise<NextResponse<ReportCard>> {
  const user = await authenticate(req)
  const studentId = parseIdParam(rawStudentId, 'student id')

  if (user.role !== 'ADMIN') {
    if (user.role !== 'STUDENT' || user.studentId !== studentId) {
      return NextResponse.json({ message: 'You can only view your own report card.' }, { status: 403 })
    }
  }

  return NextResponse.json(await getReportCard(studentId))
}
