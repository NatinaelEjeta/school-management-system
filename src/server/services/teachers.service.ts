import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import { hashPassword } from '@/server/services/auth.service'
import type { TeacherCreateInput, TeacherUpdateInput } from '@/server/validation'
import type { TeacherDto } from '@/types/school'

type TeacherWithUser = Prisma.TeacherGetPayload<{ include: { user: true; _count: { select: { courses: true } } } }>

function toTeacherDto(teacher: TeacherWithUser): TeacherDto {
  return {
    id: teacher.id,
    userId: teacher.userId,
    name: teacher.user.name,
    email: teacher.user.email,
    courseCount: teacher._count.courses,
    createdAt: teacher.user.createdAt.toISOString(),
  }
}

export async function listTeachers(search: string): Promise<TeacherDto[]> {
  const where: Prisma.TeacherWhereInput = search
    ? { OR: [{ user: { name: { contains: search } } }, { user: { email: { contains: search } } }] }
    : {}

  const teachers = await db.teacher.findMany({
    where,
    include: { user: true, _count: { select: { courses: true } } },
    orderBy: { user: { name: 'asc' } },
  })
  return teachers.map(toTeacherDto)
}

export async function createTeacher(input: TeacherCreateInput): Promise<TeacherDto> {
  const email = input.email.trim().toLowerCase()
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) throw new ApiError(409, 'A user with this email already exists.')

  const passwordHash = await hashPassword(input.password)
  const teacher = await db.teacher.create({
    data: { user: { create: { name: input.name.trim(), email, passwordHash, role: 'TEACHER' } } },
    include: { user: true, _count: { select: { courses: true } } },
  })
  return toTeacherDto(teacher)
}

export async function updateTeacher(id: number, input: TeacherUpdateInput): Promise<TeacherDto> {
  const teacher = await db.teacher.findUnique({ where: { id }, include: { user: true } })
  if (!teacher) throw new ApiError(404, 'Teacher not found.')

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase()
    if (email !== teacher.user.email) {
      const existing = await db.user.findUnique({ where: { email } })
      if (existing) throw new ApiError(409, 'A user with this email already exists.')
    }
  }

  await db.user.update({
    where: { id: teacher.userId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.password !== undefined ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  })

  const updated = await db.teacher.findUniqueOrThrow({
    where: { id },
    include: { user: true, _count: { select: { courses: true } } },
  })
  return toTeacherDto(updated)
}

export async function deleteTeacher(id: number): Promise<void> {
  const teacher = await db.teacher.findUnique({ where: { id } })
  if (!teacher) throw new ApiError(404, 'Teacher not found.')
  // Deleting the user cascades to the teacher profile; courses are kept (teacherId set to null).
  await db.user.delete({ where: { id: teacher.userId } })
}
