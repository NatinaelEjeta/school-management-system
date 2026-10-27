import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import { hashPassword } from '@/server/services/auth.service'
import type { StudentCreateInput, StudentUpdateInput } from '@/server/validation'
import type { StudentDto, StudentListResponse } from '@/types/school'

type StudentWithUser = Prisma.StudentGetPayload<{ include: { user: true; _count: { select: { enrollments: true } } } }>

function toStudentDto(student: StudentWithUser): StudentDto {
  return {
    id: student.id,
    userId: student.userId,
    name: student.user.name,
    email: student.user.email,
    gradeLevel: student.gradeLevel,
    dateOfBirth: student.dateOfBirth,
    enrollmentCount: student._count.enrollments,
    createdAt: student.user.createdAt.toISOString(),
  }
}

export async function listStudents(params: { search: string; page: number; pageSize: number }): Promise<StudentListResponse> {
  const { search, page, pageSize } = params
  const where: Prisma.StudentWhereInput = search
    ? {
        OR: [
          { user: { name: { contains: search } } },
          { user: { email: { contains: search } } },
          { gradeLevel: { contains: search } },
        ],
      }
    : {}

  const [total, students] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where,
      include: { user: true, _count: { select: { enrollments: true } } },
      orderBy: { user: { name: 'asc' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    students: students.map(toStudentDto),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getStudent(id: number): Promise<StudentDto> {
  const student = await db.student.findUnique({
    where: { id },
    include: { user: true, _count: { select: { enrollments: true } } },
  })
  if (!student) throw new ApiError(404, 'Student not found.')
  return toStudentDto(student)
}

export async function createStudent(input: StudentCreateInput): Promise<StudentDto> {
  const email = input.email.trim().toLowerCase()
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) throw new ApiError(409, 'A user with this email already exists.')

  const passwordHash = await hashPassword(input.password)
  const student = await db.student.create({
    data: {
      gradeLevel: input.gradeLevel,
      dateOfBirth: input.dateOfBirth ?? null,
      user: { create: { name: input.name.trim(), email, passwordHash, role: 'STUDENT' } },
    },
    include: { user: true, _count: { select: { enrollments: true } } },
  })
  return toStudentDto(student)
}

export async function updateStudent(id: number, input: StudentUpdateInput): Promise<StudentDto> {
  const student = await db.student.findUnique({ where: { id }, include: { user: true } })
  if (!student) throw new ApiError(404, 'Student not found.')

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase()
    if (email !== student.user.email) {
      const existing = await db.user.findUnique({ where: { email } })
      if (existing) throw new ApiError(409, 'A user with this email already exists.')
    }
  }

  await db.user.update({
    where: { id: student.userId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.password !== undefined ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  })

  await db.student.update({
    where: { id },
    data: {
      ...(input.gradeLevel !== undefined ? { gradeLevel: input.gradeLevel } : {}),
      ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth ?? null } : {}),
    },
  })

  return getStudent(id)
}

export async function deleteStudent(id: number): Promise<void> {
  const student = await db.student.findUnique({ where: { id } })
  if (!student) throw new ApiError(404, 'Student not found.')
  // Deleting the user cascades: student → enrollments → attendance + grades.
  await db.user.delete({ where: { id: student.userId } })
}
