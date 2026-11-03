import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import { hashPassword } from '@/server/services/auth.service'
import { nextStudentCode, withCodeRetry } from '@/server/services/codes'
import type { StudentCreateInput, StudentUpdateInput } from '@/server/validation'
import type { StudentDto, StudentListResponse } from '@/types/school'

type StudentWithUser = Prisma.StudentGetPayload<{ include: { user: true; schoolClass: true; family: true; _count: { select: { enrollments: true } } } }>

function toStudentDto(student: StudentWithUser): StudentDto {
  return {
    id: student.id,
    userId: student.userId,
    name: student.user.name,
    email: student.user.email,
    gradeLevel: student.gradeLevel,
    dateOfBirth: student.dateOfBirth,
    enrollmentCount: student._count.enrollments,
    studentCode: student.studentCode,
    classId: student.classId,
    className: student.schoolClass?.name ?? null,
    familyId: student.familyId,
    familyCode: student.family?.familyCode ?? null,
    familyName: student.family?.familyName ?? null,
    createdAt: student.user.createdAt.toISOString(),
  }
}

export async function listStudents(params: { search: string; page: number; pageSize: number }): Promise<StudentListResponse> {
  const { search, page, pageSize } = params
  const where: Prisma.StudentWhereInput = search
    ? {
        OR: [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { gradeLevel: { contains: search, mode: 'insensitive' } },
          { studentCode: { contains: search, mode: 'insensitive' } },
          { family: { familyCode: { contains: search, mode: 'insensitive' } } },
          { family: { familyName: { contains: search, mode: 'insensitive' } } },
        ],
      }
    : {}

  const [total, students] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where,
      include: { user: true, schoolClass: true, family: true, _count: { select: { enrollments: true } } },
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
    include: { user: true, schoolClass: true, family: true, _count: { select: { enrollments: true } } },
  })
  if (!student) throw new ApiError(404, 'Student not found.')
  return toStudentDto(student)
}

export async function createStudent(input: StudentCreateInput): Promise<StudentDto> {
  const email = input.email.trim().toLowerCase()
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) throw new ApiError(409, 'A user with this email already exists.')

  const passwordHash = await hashPassword(input.password)
  if (input.familyId != null) {
    const family = await db.family.findUnique({ where: { id: input.familyId } })
    if (!family) throw new ApiError(404, 'Family not found.')
  }
  if (input.classId != null) {
    const cls = await db.schoolClass.findUnique({ where: { id: input.classId } })
    if (!cls) throw new ApiError(404, 'Class not found.')
  }
  const student = await withCodeRetry(async () => db.student.create({
    data: {
      studentCode: await nextStudentCode(),
      gradeLevel: input.gradeLevel,
      dateOfBirth: input.dateOfBirth,
      ...(input.classId != null ? { schoolClass: { connect: { id: input.classId } } } : {}),
      ...(input.familyId != null ? { family: { connect: { id: input.familyId } } } : {}),
      user: { create: { name: input.name.trim(), email, passwordHash, role: 'STUDENT' } },
    },
    include: { user: true, schoolClass: true, family: true, _count: { select: { enrollments: true } } },
  }))
  return toStudentDto(student)
}

export async function updateStudent(id: number, input: StudentUpdateInput): Promise<StudentDto> {
  const student = await db.student.findUnique({ where: { id }, include: { user: true } })
  if (!student) throw new ApiError(404, 'Student not found.')
  if (input.familyId !== undefined && input.familyId !== null) {
    const family = await db.family.findUnique({ where: { id: input.familyId } })
    if (!family) throw new ApiError(404, 'Family not found.')
  }
  if (input.classId !== undefined && input.classId !== null) {
    const cls = await db.schoolClass.findUnique({ where: { id: input.classId } })
    if (!cls) throw new ApiError(404, 'Class not found.')
  }

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
      ...(input.classId !== undefined ? { classId: input.classId ?? null } : {}),
      ...(input.familyId !== undefined ? { familyId: input.familyId ?? null } : {}),
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
