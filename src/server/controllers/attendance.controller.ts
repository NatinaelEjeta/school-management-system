import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/middleware/auth'
import { parseIdParam, readJsonBody } from '@/server/http'
import { attendanceSaveSchema } from '@/server/validation'
import { getAttendanceSheet, getMyAttendance, saveAttendance } from '@/server/services/attendance.service'
import type { AttendanceSheetResponse, AttendanceStatus, MyAttendanceResponse } from '@/types/school'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseCourseId(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get('courseId') ?? ''
  return parseIdParam(raw, 'courseId')
}

/** GET /api/attendance?courseId&date — the attendance sheet for one course and date. */
export async function handleGetAttendanceSheet(req: NextRequest): Promise<NextResponse<AttendanceSheetResponse>> {
  const user = await requireRole(req, 'ADMIN', 'TEACHER')
  const courseId = parseCourseId(req)
  const date = req.nextUrl.searchParams.get('date') ?? ''
  if (!DATE_PATTERN.test(date)) {
    return NextResponse.json({ message: 'The `date` query parameter must use the YYYY-MM-DD format.' }, { status: 400 })
  }
  return NextResponse.json(await getAttendanceSheet(user, courseId, date))
}

/** POST /api/attendance — bulk save marks for a course and date (teacher's own course or admin). */
export async function handleSaveAttendance(req: NextRequest): Promise<NextResponse<{ courseId: number; date: string; saved: number }>> {
  const user = await requireRole(req, 'ADMIN', 'TEACHER')
  const input = attendanceSaveSchema.parse(await readJsonBody(req))
  return NextResponse.json(await saveAttendance(user, input))
}

/** GET /api/attendance/me — the signed-in student's own attendance. */
export async function handleMyAttendance(req: NextRequest): Promise<NextResponse<MyAttendanceResponse>> {
  const user = await requireRole(req, 'STUDENT')
  if (user.studentId === null) {
    return NextResponse.json({ message: 'No student profile is linked to this account.' }, { status: 400 })
  }
  return NextResponse.json(await getMyAttendance(user.studentId))
}

export type { AttendanceStatus }
