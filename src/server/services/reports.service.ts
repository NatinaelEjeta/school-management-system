import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import type { AttendanceCount, AttendanceStatus, ReportCard, ReportCardCourse } from '@/types/school'

/** Full report card data for a student (used by the PDF exporter and the preview view). */
export async function getReportCard(studentId: number): Promise<ReportCard> {
  const student = await db.student.findUnique({ where: { id: studentId }, include: { user: true } })
  if (!student) throw new ApiError(404, 'Student not found.')

  const enrollments = await db.enrollment.findMany({
    where: { studentId },
    include: {
      course: { include: { teacher: { include: { user: true } } } },
      grades: { orderBy: { createdAt: 'asc' } },
      attendance: true,
    },
    orderBy: { course: { name: 'asc' } },
  })

  const overall = { present: 0, absent: 0, late: 0 }
  let totalScore = 0
  let totalMax = 0

  const courses: ReportCardCourse[] = enrollments.map((enrollment) => {
    let courseScore = 0
    let courseMax = 0
    const attendance = { present: 0, absent: 0, late: 0 }

    for (const grade of enrollment.grades) {
      courseScore += grade.score
      courseMax += grade.maxScore
    }
    for (const record of enrollment.attendance) {
      const status = record.status as AttendanceStatus
      if (status === 'PRESENT') attendance.present += 1
      else if (status === 'LATE') attendance.late += 1
      else if (status === 'ABSENT') attendance.absent += 1
    }

    overall.present += attendance.present
    overall.absent += attendance.absent
    overall.late += attendance.late
    totalScore += courseScore
    totalMax += courseMax

    return {
      courseId: enrollment.course.id,
      courseName: enrollment.course.name,
      teacherName: enrollment.course.teacher?.user.name ?? null,
      grades: enrollment.grades.map((grade) => ({
        id: grade.id,
        assessmentName: grade.assessmentName,
        score: grade.score,
        maxScore: grade.maxScore,
        percent: Math.round((grade.score / grade.maxScore) * 1000) / 10,
      })),
      averagePercent: courseMax === 0 ? null : Math.round((courseScore / courseMax) * 1000) / 10,
      attendance,
    }
  })

  const attendanceTotal = overall.present + overall.absent + overall.late
  const attendance: AttendanceCount = {
    ...overall,
    total: attendanceTotal,
    rate: attendanceTotal === 0 ? 0 : Math.round(((overall.present + overall.late) / attendanceTotal) * 1000) / 10,
  }

  return {
    student: {
      id: student.id,
      name: student.user.name,
      email: student.user.email,
      gradeLevel: student.gradeLevel,
      dateOfBirth: student.dateOfBirth,
    },
    courses,
    overallAveragePercent: totalMax === 0 ? null : Math.round((totalScore / totalMax) * 1000) / 10,
    attendance,
    generatedAt: new Date().toISOString(),
  }
}
