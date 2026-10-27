import { NextRequest, NextResponse } from 'next/server'
import { authenticate, assertCourseAccess, requireRole } from '@/server/middleware/auth'
import { readJsonBody, parseIdParam } from '@/server/http'
import { courseCreateSchema, courseUpdateSchema, enrollSchema } from '@/server/validation'
import {
  createCourse,
  deleteCourse,
  enrollStudent,
  getCourseDetail,
  getEnrollableStudents,
  listCourses,
  unenrollStudent,
  updateCourse,
} from '@/server/services/courses.service'
import type { CourseDetailResponse, CourseDto, RosterStudent, StudentDto } from '@/types/school'

/** GET /api/courses — role-scoped: ADMIN all, TEACHER own, STUDENT enrolled. */
export async function handleListCourses(req: NextRequest): Promise<NextResponse<CourseDto[]>> {
  const user = await authenticate(req)
  return NextResponse.json(await listCourses(user))
}

/** POST /api/courses (ADMIN) */
export async function handleCreateCourse(req: NextRequest): Promise<NextResponse<CourseDto>> {
  await requireRole(req, 'ADMIN')
  const input = courseCreateSchema.parse(await readJsonBody(req))
  return NextResponse.json(await createCourse(input), { status: 201 })
}

/** GET /api/courses/:id — detail + roster (ADMIN or owning TEACHER). */
export async function handleGetCourse(req: NextRequest, rawId: string): Promise<NextResponse<CourseDetailResponse>> {
  const user = await authenticate(req)
  const id = parseIdParam(rawId, 'course id')
  await assertCourseAccess(user, id)
  return NextResponse.json(await getCourseDetail(id))
}

/** PUT /api/courses/:id (ADMIN) */
export async function handleUpdateCourse(req: NextRequest, rawId: string): Promise<NextResponse<CourseDto>> {
  await requireRole(req, 'ADMIN')
  const id = parseIdParam(rawId, 'course id')
  const input = courseUpdateSchema.parse(await readJsonBody(req))
  return NextResponse.json(await updateCourse(id, input))
}

/** DELETE /api/courses/:id (ADMIN) */
export async function handleDeleteCourse(req: NextRequest, rawId: string): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  const id = parseIdParam(rawId, 'course id')
  await deleteCourse(id)
  return new NextResponse(null, { status: 204 })
}

/**
 * GET /api/courses/:id/students?scope=unenrolled —
 * roster by default, or students available to enroll (ADMIN).
 */
export async function handleCourseStudents(
  req: NextRequest,
  rawId: string,
): Promise<NextResponse<RosterStudent[] | StudentDto[]>> {
  const user = await authenticate(req)
  const id = parseIdParam(rawId, 'course id')
  const scope = req.nextUrl.searchParams.get('scope')

  if (scope === 'unenrolled') {
    await requireRole(req, 'ADMIN')
    return NextResponse.json(await getEnrollableStudents(id))
  }

  await assertCourseAccess(user, id)
  const detail = await getCourseDetail(id)
  return NextResponse.json(detail.roster)
}

/** POST /api/courses/:id/students { studentId } — enroll (ADMIN). */
export async function handleEnrollStudent(req: NextRequest, rawId: string): Promise<NextResponse<RosterStudent>> {
  await requireRole(req, 'ADMIN')
  const courseId = parseIdParam(rawId, 'course id')
  const input = enrollSchema.parse(await readJsonBody(req))
  return NextResponse.json(await enrollStudent(courseId, input.studentId), { status: 201 })
}

/** DELETE /api/courses/:id/students/:studentId — unenroll (ADMIN). */
export async function handleUnenrollStudent(req: NextRequest, rawCourseId: string, rawStudentId: string): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  const courseId = parseIdParam(rawCourseId, 'course id')
  const studentId = parseIdParam(rawStudentId, 'student id')
  await unenrollStudent(courseId, studentId)
  return new NextResponse(null, { status: 204 })
}
