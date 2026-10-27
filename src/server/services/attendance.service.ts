import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import { assertCourseAccess } from '@/server/middleware/auth'
import type { AttendanceSaveInput } from '@/server/validation'
import type {
  AttendanceCount,
  AttendanceRecordDto,
  AttendanceSheetResponse,
  AttendanceStatus,
  AuthUser,
  CourseAttendanceSummary,
  MyAttendanceResponse,
} from '@/types/school'

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE']

function emptyCount(): AttendanceCount {
  return { present: 0, absent: 0, late: 0, total: 0, rate: 0 }
}

function finalizeCount(count: AttendanceCount): AttendanceCount {
  const attended = count.present + count.late
  return { ...count, rate: count.total === 0 ? 0 : Math.round((attended / count.total) * 1000) / 10 }
}

/** Roster for a course+date with each student's saved status (null = not marked yet). */
export async function getAttendanceSheet(user: AuthUser, courseId: number, date: string): Promise<AttendanceSheetResponse> {
  await assertCourseAccess(user, courseId)

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      enrollments: { include: { student: { include: { user: true } } }, orderBy: { student: { user: { name: 'asc' } } } },
    },
  })
  if (!course) throw new ApiError(404, 'Course not found.')

  const records = await db.attendance.findMany({
    where: { date, enrollment: { courseId } },
    select: { enrollmentId: true, status: true },
  })
  const statusByEnrollment = new Map(records.map((record) => [record.enrollmentId, record.status as AttendanceStatus]))

  return {
    courseId: course.id,
    courseName: course.name,
    date,
    rows: course.enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      name: enrollment.student.user.name,
      email: enrollment.student.user.email,
      gradeLevel: enrollment.student.gradeLevel,
      status: statusByEnrollment.get(enrollment.id) ?? null,
    })),
  }
}

/**
 * Bulk save (upsert) attendance for a course+date.
 * The unique constraint (enrollmentId, date) guarantees no duplicate records
 * for the same student, course and date.
 */
export async function saveAttendance(user: AuthUser, input: AttendanceSaveInput): Promise<{ courseId: number; date: string; saved: number }> {
  const { courseId, date, records } = input

  const course = await db.course.findUnique({ where: { id: courseId } })
  if (!course) throw new ApiError(404, 'Course not found.')
  await assertCourseAccess(user, courseId)

  const enrollments = await db.enrollment.findMany({ where: { courseId }, select: { id: true } })
  const validEnrollmentIds = new Set(enrollments.map((enrollment) => enrollment.id))
  for (const record of records) {
    if (!validEnrollmentIds.has(record.enrollmentId)) {
      throw new ApiError(400, 'One or more records do not belong to this course.')
    }
  }

  await db.$transaction(
    records.map((record) =>
      db.attendance.upsert({
        where: { enrollmentId_date: { enrollmentId: record.enrollmentId, date } },
        update: { status: record.status },
        create: { enrollmentId: record.enrollmentId, date, status: record.status },
      }),
    ),
  )

  return { courseId, date, saved: records.length }
}

/** A student's own attendance: overall summary, per-course breakdown and recent records. */
export async function getMyAttendance(studentId: number): Promise<MyAttendanceResponse> {
  const rows = await db.attendance.findMany({
    where: { enrollment: { studentId } },
    include: { enrollment: { include: { course: { select: { id: true, name: true } } } } },
    orderBy: { date: 'desc' },
  })

  const overall = emptyCount()
  const byCourseMap = new Map<number, { courseName: string; present: number; absent: number; late: number; total: number }>()

  for (const row of rows) {
    const status = row.status as AttendanceStatus
    if (!ATTENDANCE_STATUSES.includes(status)) continue

    overall.total += 1
    if (status === 'PRESENT') overall.present += 1
    else if (status === 'LATE') overall.late += 1
    else overall.absent += 1

    const courseId = row.enrollment.course.id
    const bucket = byCourseMap.get(courseId) ?? {
      courseName: row.enrollment.course.name,
      present: 0,
      absent: 0,
      late: 0,
      total: 0,
    }
    bucket.total += 1
    if (status === 'PRESENT') bucket.present += 1
    else if (status === 'LATE') bucket.late += 1
    else bucket.absent += 1
    byCourseMap.set(courseId, bucket)
  }

  const byCourse: CourseAttendanceSummary[] = Array.from(byCourseMap.entries())
    .map(([courseId, bucket]) => ({
      courseId,
      courseName: bucket.courseName,
      present: bucket.present,
      absent: bucket.absent,
      late: bucket.late,
      total: bucket.total,
      rate: bucket.total === 0 ? 0 : Math.round(((bucket.present + bucket.late) / bucket.total) * 1000) / 10,
    }))
    .sort((a, b) => a.courseName.localeCompare(b.courseName))

  const recent: AttendanceRecordDto[] = rows.slice(0, 20).map((row) => ({
    id: row.id,
    date: row.date,
    status: row.status as AttendanceStatus,
    courseName: row.enrollment.course.name,
  }))

  return { overall: finalizeCount(overall), byCourse, recent }
}
