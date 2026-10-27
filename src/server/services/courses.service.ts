import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import type { CourseCreateInput, CourseUpdateInput } from '@/server/validation'
import type { AuthUser, CourseDetailResponse, CourseDto, RosterStudent, StudentDto } from '@/types/school'

type CourseWithTeacher = Prisma.CourseGetPayload<{ include: { teacher: { include: { user: true } } ; _count: { select: { enrollments: true } } } }>

function toCourseDto(course: CourseWithTeacher): CourseDto {
  return {
    id: course.id,
    name: course.name,
    teacherId: course.teacherId,
    teacherName: course.teacher?.user.name ?? null,
    studentCount: course._count.enrollments,
  }
}

/** Role-scoped listing: ADMIN sees all, TEACHER only their own, STUDENT only enrolled courses. */
export async function listCourses(user: AuthUser): Promise<CourseDto[]> {
  const where: Prisma.CourseWhereInput =
    user.role === 'TEACHER'
      ? { teacherId: user.teacherId ?? -1 }
      : user.role === 'STUDENT'
        ? { enrollments: { some: { studentId: user.studentId ?? -1 } } }
        : {}

  const courses = await db.course.findMany({
    where,
    include: { teacher: { include: { user: true } }, _count: { select: { enrollments: true } } },
    orderBy: { name: 'asc' },
  })
  return courses.map(toCourseDto)
}

async function assertTeacherExists(teacherId: number | null | undefined): Promise<void> {
  if (teacherId === null || teacherId === undefined) return
  const teacher = await db.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) throw new ApiError(404, 'Teacher not found.')
}

export async function createCourse(input: CourseCreateInput): Promise<CourseDto> {
  await assertTeacherExists(input.teacherId)
  const course = await db.course.create({
    data: { name: input.name.trim(), teacherId: input.teacherId ?? null },
    include: { teacher: { include: { user: true } }, _count: { select: { enrollments: true } } },
  })
  return toCourseDto(course)
}

export async function updateCourse(id: number, input: CourseUpdateInput): Promise<CourseDto> {
  const course = await db.course.findUnique({ where: { id } })
  if (!course) throw new ApiError(404, 'Course not found.')

  await assertTeacherExists(input.teacherId)

  await db.course.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.teacherId !== undefined ? { teacherId: input.teacherId ?? null } : {}),
    },
  })

  const updated = await db.course.findUniqueOrThrow({
    where: { id },
    include: { teacher: { include: { user: true } }, _count: { select: { enrollments: true } } },
  })
  return toCourseDto(updated)
}

export async function deleteCourse(id: number): Promise<void> {
  const course = await db.course.findUnique({ where: { id } })
  if (!course) throw new ApiError(404, 'Course not found.')
  // Cascades: enrollments → attendance + grades.
  await db.course.delete({ where: { id } })
}

/** Course detail + roster for ADMIN or the owning TEACHER. */
export async function getCourseDetail(id: number): Promise<CourseDetailResponse> {
  const course = await db.course.findUnique({
    where: { id },
    include: {
      teacher: { include: { user: true } },
      _count: { select: { enrollments: true } },
      enrollments: {
        include: { student: { include: { user: true } } },
        orderBy: { student: { user: { name: 'asc' } } },
      },
    },
  })
  if (!course) throw new ApiError(404, 'Course not found.')

  const roster: RosterStudent[] = course.enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    studentId: enrollment.studentId,
    name: enrollment.student.user.name,
    email: enrollment.student.user.email,
    gradeLevel: enrollment.student.gradeLevel,
  }))

  return {
    course: {
      id: course.id,
      name: course.name,
      teacherId: course.teacherId,
      teacherName: course.teacher?.user.name ?? null,
      studentCount: course._count.enrollments,
    },
    roster,
  }
}

export async function getRoster(courseId: number): Promise<RosterStudent[]> {
  return (await getCourseDetail(courseId)).roster
}

/** Students NOT enrolled in the course — used by the admin enrollment dialog. */
export async function getEnrollableStudents(courseId: number): Promise<StudentDto[]> {
  const course = await db.course.findUnique({ where: { id: courseId } })
  if (!course) throw new ApiError(404, 'Course not found.')

  const students = await db.student.findMany({
    where: { NOT: { enrollments: { some: { courseId } } } },
    include: { user: true, _count: { select: { enrollments: true } } },
    orderBy: { user: { name: 'asc' } },
    take: 200,
  })

  return students.map((student) => ({
    id: student.id,
    userId: student.userId,
    name: student.user.name,
    email: student.user.email,
    gradeLevel: student.gradeLevel,
    dateOfBirth: student.dateOfBirth,
    enrollmentCount: student._count.enrollments,
    createdAt: student.user.createdAt.toISOString(),
  }))
}

export async function enrollStudent(courseId: number, studentId: number): Promise<RosterStudent> {
  const course = await db.course.findUnique({ where: { id: courseId } })
  if (!course) throw new ApiError(404, 'Course not found.')

  const student = await db.student.findUnique({ where: { id: studentId }, include: { user: true } })
  if (!student) throw new ApiError(404, 'Student not found.')

  const existing = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  })
  if (existing) throw new ApiError(409, `${student.user.name} is already enrolled in ${course.name}.`)

  const enrollment = await db.enrollment.create({ data: { studentId, courseId } })
  return {
    enrollmentId: enrollment.id,
    studentId,
    name: student.user.name,
    email: student.user.email,
    gradeLevel: student.gradeLevel,
  }
}

export async function unenrollStudent(courseId: number, studentId: number): Promise<void> {
  const enrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  })
  if (!enrollment) throw new ApiError(404, 'This student is not enrolled in the course.')
  // Cascades: the student's attendance and grades for this course are removed.
  await db.enrollment.delete({ where: { id: enrollment.id } })
}
