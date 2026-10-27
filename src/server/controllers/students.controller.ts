import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/middleware/auth'
import { readJsonBody, parseIdParam, parseIntParam } from '@/server/http'
import { studentCreateSchema, studentUpdateSchema } from '@/server/validation'
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  updateStudent,
} from '@/server/services/students.service'
import type { StudentDto, StudentListResponse } from '@/types/school'

/** GET /api/students?search=&page=&pageSize= (ADMIN) */
export async function handleListStudents(req: NextRequest): Promise<NextResponse<StudentListResponse>> {
  await requireRole(req, 'ADMIN')
  const params = req.nextUrl.searchParams
  const data = await listStudents({
    search: (params.get('search') ?? '').trim().slice(0, 100),
    page: parseIntParam(params.get('page'), { min: 1, max: 100000, fallback: 1 }),
    pageSize: parseIntParam(params.get('pageSize'), { min: 1, max: 50, fallback: 10 }),
  })
  return NextResponse.json(data)
}

/** POST /api/students (ADMIN) */
export async function handleCreateStudent(req: NextRequest): Promise<NextResponse<StudentDto>> {
  await requireRole(req, 'ADMIN')
  const input = studentCreateSchema.parse(await readJsonBody(req))
  const student = await createStudent(input)
  return NextResponse.json(student, { status: 201 })
}

/** GET /api/students/:id (ADMIN) */
export async function handleGetStudent(req: NextRequest, rawId: string): Promise<NextResponse<StudentDto>> {
  await requireRole(req, 'ADMIN')
  const id = parseIdParam(rawId, 'student id')
  return NextResponse.json(await getStudent(id))
}

/** PUT /api/students/:id (ADMIN) */
export async function handleUpdateStudent(req: NextRequest, rawId: string): Promise<NextResponse<StudentDto>> {
  await requireRole(req, 'ADMIN')
  const id = parseIdParam(rawId, 'student id')
  const input = studentUpdateSchema.parse(await readJsonBody(req))
  return NextResponse.json(await updateStudent(id, input))
}

/** DELETE /api/students/:id (ADMIN) */
export async function handleDeleteStudent(req: NextRequest, rawId: string): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  const id = parseIdParam(rawId, 'student id')
  await deleteStudent(id)
  return new NextResponse(null, { status: 204 })
}
