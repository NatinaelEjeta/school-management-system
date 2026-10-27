import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import { assertCourseAccess } from '@/server/middleware/auth'
import type { GradeCreateInput } from '@/server/validation'
import type { AuthUser, GradeRow, MyGradesResponse } from '@/types/school'

type GradeWithRelations = {
  id: number
  enrollmentId: number
  assessmentName: string
  score: number
  maxScore: number
  createdAt: Date
  enrollment: { studentId: number; student: { user: { name: string } }; courseId: number }
}

function toGradeRow(grade: GradeWithRelations): GradeRow {
  return {
    id: grade.id,
    enrollmentId: grade.enrollmentId,
    studentId: grade.enrollment.studentId,
    studentName: grade.enrollment.student.user.name,
    assessmentName: grade.assessmentName,
    score: grade.score,
    maxScore: grade.maxScore,
    percent: Math.round((grade.score / grade.maxScore) * 1000) / 10,
    createdAt: grade.createdAt.toISOString(),
  }
}

/** All grades in a course (teacher's own course or admin). */
export async function listCourseGrades(user: AuthUser, courseId: number): Promise<GradeRow[]> {
  await assertCourseAccess(user, courseId)

  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) throw new ApiError(404, 'Course not found.')

  const grades = await db.grade.findMany({
    where: { enrollment: { courseId } },
    include: { enrollment: { include: { student: { include: { user: true } } } } },
    orderBy: [{ enrollment: { student: { user: { name: 'asc' } } } }, { createdAt: 'desc' }],
  })
  return grades.map(toGradeRow)
}

export async function addGrade(user: AuthUser, input: GradeCreateInput): Promise<GradeRow> {
  const enrollment = await db.enrollment.findUnique({
    where: { id: input.enrollmentId },
    include: { student: { include: { user: true } }, course: { select: { id: true } } },
  })
  if (!enrollment) throw new ApiError(404, 'Enrollment not found — the student may have been unenrolled.')

  await assertCourseAccess(user, enrollment.course.id)

  const grade = await db.grade.create({
    data: {
      enrollmentId: input.enrollmentId,
      assessmentName: input.assessmentName.trim(),
      score: input.score,
      maxScore: input.maxScore,
    },
    include: { enrollment: { include: { student: { include: { user: true } } } } },
  })
  return toGradeRow(grade)
}

export async function deleteGrade(user: AuthUser, id: number): Promise<void> {
  const grade = await db.grade.findUnique({
    where: { id },
    include: { enrollment: { include: { course: { select: { id: true } } } } },
  })
  if (!grade) throw new ApiError(404, 'Grade not found.')

  await assertCourseAccess(user, grade.enrollment.course.id)
  await db.grade.delete({ where: { id } })
}

/** A student's own grades: per-course assessments, per-course average and overall average. */
export async function getMyGrades(studentId: number): Promise<MyGradesResponse> {
  const enrollments = await db.enrollment.findMany({
    where: { studentId },
    include: {
      course: { include: { teacher: { include: { user: true } } } },
      grades: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { course: { name: 'asc' } },
  })

  let totalScore = 0
  let totalMax = 0
  let totalAssessments = 0

  const courses = enrollments.map((enrollment) => {
    let courseScore = 0
    let courseMax = 0
    const grades = enrollment.grades.map((grade) => {
      courseScore += grade.score
      courseMax += grade.maxScore
      return {
        id: grade.id,
        assessmentName: grade.assessmentName,
        score: grade.score,
        maxScore: grade.maxScore,
        percent: Math.round((grade.score / grade.maxScore) * 1000) / 10,
        createdAt: grade.createdAt.toISOString(),
      }
    })
    totalScore += courseScore
    totalMax += courseMax
    totalAssessments += grades.length

    return {
      courseId: enrollment.course.id,
      courseName: enrollment.course.name,
      teacherName: enrollment.course.teacher?.user.name ?? null,
      grades,
      averagePercent: courseMax === 0 ? null : Math.round((courseScore / courseMax) * 1000) / 10,
    }
  })

  return {
    courses,
    overallAveragePercent: totalMax === 0 ? null : Math.round((totalScore / totalMax) * 1000) / 10,
    totalAssessments,
  }
}
