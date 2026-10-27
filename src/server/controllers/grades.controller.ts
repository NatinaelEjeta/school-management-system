import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/middleware/auth'
import { parseIdParam, readJsonBody } from '@/server/http'
import { gradeCreateSchema } from '@/server/validation'
import { addGrade, deleteGrade, getMyGrades, listCourseGrades } from '@/server/services/grades.service'
import type { GradeRow, MyGradesResponse } from '@/types/school'

/** GET /api/grades?courseId — all grades in a course (teacher's own course or admin). */
export async function handleListCourseGrades(req: NextRequest): Promise<NextResponse<GradeRow[]>> {
  const user = await requireRole(req, 'ADMIN', 'TEACHER')
  const raw = req.nextUrl.searchParams.get('courseId') ?? ''
  const courseId = parseIdParam(raw, 'courseId')
  return NextResponse.json(await listCourseGrades(user, courseId))
}

/** POST /api/grades — add an assessment score (teacher's own course or admin). */
export async function handleAddGrade(req: NextRequest): Promise<NextResponse<GradeRow>> {
  const user = await requireRole(req, 'ADMIN', 'TEACHER')
  const input = gradeCreateSchema.parse(await readJsonBody(req))
  return NextResponse.json(await addGrade(user, input), { status: 201 })
}

/** GET /api/grades/me — the signed-in student's own grades and averages. */
export async function handleMyGrades(req: NextRequest): Promise<NextResponse<MyGradesResponse>> {
  const user = await requireRole(req, 'STUDENT')
  if (user.studentId === null) {
    return NextResponse.json({ message: 'No student profile is linked to this account.' }, { status: 400 })
  }
  return NextResponse.json(await getMyGrades(user.studentId))
}

/** DELETE /api/grades/:id (teacher's own course or admin). */
export async function handleDeleteGrade(req: NextRequest, rawId: string): Promise<NextResponse> {
  const user = await requireRole(req, 'ADMIN', 'TEACHER')
  const id = parseIdParam(rawId, 'grade id')
  await deleteGrade(user, id)
  return new NextResponse(null, { status: 204 })
}
