import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/middleware/auth'
import { readJsonBody, parseIdParam } from '@/server/http'
import { teacherCreateSchema, teacherUpdateSchema } from '@/server/validation'
import { createTeacher, deleteTeacher, listTeachers, updateTeacher } from '@/server/services/teachers.service'
import type { TeacherDto } from '@/types/school'

/** GET /api/teachers?search= (ADMIN) */
export async function handleListTeachers(req: NextRequest): Promise<NextResponse<TeacherDto[]>> {
  await requireRole(req, 'ADMIN')
  const search = (req.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 100)
  return NextResponse.json(await listTeachers(search))
}

/** POST /api/teachers (ADMIN) */
export async function handleCreateTeacher(req: NextRequest): Promise<NextResponse<TeacherDto>> {
  await requireRole(req, 'ADMIN')
  const input = teacherCreateSchema.parse(await readJsonBody(req))
  return NextResponse.json(await createTeacher(input), { status: 201 })
}

/** PUT /api/teachers/:id (ADMIN) */
export async function handleUpdateTeacher(req: NextRequest, rawId: string): Promise<NextResponse<TeacherDto>> {
  await requireRole(req, 'ADMIN')
  const id = parseIdParam(rawId, 'teacher id')
  const input = teacherUpdateSchema.parse(await readJsonBody(req))
  return NextResponse.json(await updateTeacher(id, input))
}

/** DELETE /api/teachers/:id (ADMIN) */
export async function handleDeleteTeacher(req: NextRequest, rawId: string): Promise<NextResponse> {
  await requireRole(req, 'ADMIN')
  const id = parseIdParam(rawId, 'teacher id')
  await deleteTeacher(id)
  return new NextResponse(null, { status: 204 })
}
