import { db } from '@/lib/db'
import type { AttendanceCount, DashboardStats } from '@/types/school'

function finalizeCount(present: number, late: number, absent: number): AttendanceCount {
  const total = present + late + absent
  const attended = present + late
  return {
    present,
    late,
    absent,
    total,
    rate: total === 0 ? 0 : Math.round((attended / total) * 1000) / 10,
  }
}

/** Aggregated statistics for the admin dashboard. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalStudents, totalTeachers, totalCourses, totalEnrollments, courses, attendanceGroups] = await Promise.all([
    db.student.count(),
    db.teacher.count(),
    db.course.count(),
    db.enrollment.count(),
    db.course.findMany({
      include: { _count: { select: { enrollments: true } } },
      orderBy: { name: 'asc' },
    }),
    db.attendance.groupBy({ by: ['status'], _count: true }),
  ])

  let present = 0
  let late = 0
  let absent = 0
  for (const group of attendanceGroups) {
    if (group.status === 'PRESENT') present = group._count
    else if (group.status === 'LATE') late = group._count
    else if (group.status === 'ABSENT') absent = group._count
  }

  // Weighted average grade (sum of scores / sum of max scores) per course.
  const avgGradePerCourse = await Promise.all(
    courses.map(async (course) => {
      const aggregate = await db.grade.aggregate({
        where: { enrollment: { courseId: course.id } },
        _sum: { score: true, maxScore: true },
      })
      const sumScore = aggregate._sum.score ?? 0
      const sumMax = aggregate._sum.maxScore ?? 0
      return {
        courseId: course.id,
        courseName: course.name,
        averagePercent: sumMax === 0 ? null : Math.round((sumScore / sumMax) * 1000) / 10,
        studentCount: course._count.enrollments,
      }
    }),
  )

  return {
    totalStudents,
    totalTeachers,
    totalCourses,
    totalEnrollments,
    attendance: finalizeCount(present, late, absent),
    avgGradePerCourse,
  }
}
