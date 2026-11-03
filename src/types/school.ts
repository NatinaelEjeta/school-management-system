/** Shared types used by both the API layer and the React client. */

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE'

export const ROLES: Role[] = ['ADMIN', 'TEACHER', 'STUDENT']
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE']
export const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] as const

/** Age limits enforced when a student is registered (whole years). */
export const MIN_STUDENT_AGE = 3
export const MAX_STUDENT_AGE = 25

export interface AuthUser {
  id: number
  name: string
  email: string
  role: Role
  studentId: number | null
  teacherId: number | null
}

export interface LoginResponse {
  user: AuthUser
  token: string
}

export interface StudentDto {
  id: number
  userId: number
  name: string
  email: string
  gradeLevel: string
  dateOfBirth: string | null
  enrollmentCount: number
  studentCode: string
  classId: number | null
  className: string | null
  familyId: number | null
  familyCode: string | null
  familyName: string | null
  createdAt: string
}

export interface StudentListResponse {
  students: StudentDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TeacherDto {
  id: number
  userId: number
  name: string
  email: string
  courseCount: number
  teacherCode: string
  classCount: number
  createdAt: string
}

export interface CourseDto {
  id: number
  name: string
  teacherId: number | null
  teacherName: string | null
  studentCount: number
}

export interface CourseDetailResponse {
  course: CourseDto
  roster: RosterStudent[]
}

export interface RosterStudent {
  enrollmentId: number
  studentId: number
  name: string
  email: string
  gradeLevel: string
}

export interface AttendanceSheetRow {
  enrollmentId: number
  studentId: number
  name: string
  email: string
  gradeLevel: string
  status: AttendanceStatus | null
}

export interface AttendanceSheetResponse {
  courseId: number
  courseName: string
  date: string
  rows: AttendanceSheetRow[]
}

export interface GradeRow {
  id: number
  enrollmentId: number
  studentId: number
  studentName: string
  assessmentName: string
  score: number
  maxScore: number
  percent: number
  createdAt: string
}

export interface CourseGradeSummary {
  courseId: number
  courseName: string
  teacherName: string | null
  grades: { id: number; assessmentName: string; score: number; maxScore: number; percent: number; createdAt: string }[]
  averagePercent: number | null
}

export interface MyGradesResponse {
  courses: CourseGradeSummary[]
  overallAveragePercent: number | null
  totalAssessments: number
}

export interface AttendanceCount {
  present: number
  absent: number
  late: number
  total: number
  rate: number
}

export interface CourseAttendanceSummary {
  courseId: number
  courseName: string
  present: number
  absent: number
  late: number
  total: number
  rate: number
}

export interface AttendanceRecordDto {
  id: number
  date: string
  status: AttendanceStatus
  courseName: string
}

export interface MyAttendanceResponse {
  overall: AttendanceCount
  byCourse: CourseAttendanceSummary[]
  recent: AttendanceRecordDto[]
}

export interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalCourses: number
  totalEnrollments: number
  attendance: AttendanceCount
  avgGradePerCourse: { courseId: number; courseName: string; averagePercent: number | null; studentCount: number }[]
}

export interface ReportCardCourse {
  courseId: number
  courseName: string
  teacherName: string | null
  grades: { id: number; assessmentName: string; score: number; maxScore: number; percent: number }[]
  averagePercent: number | null
  attendance: { present: number; absent: number; late: number }
}

export interface ReportCard {
  student: {
    id: number
    name: string
    email: string
    gradeLevel: string
    dateOfBirth: string | null
  }
  courses: ReportCardCourse[]
  overallAveragePercent: number | null
  attendance: AttendanceCount
  generatedAt: string
}

export interface ApiErrorBody {
  message: string
  details?: { path: string; message: string }[]
}

export interface ClassDto {
  id: number
  name: string
  gradeLevel: string
  homeroomTeacherId: number | null
  homeroomTeacherName: string | null
  studentCount: number
}

export interface FamilyDto {
  id: number
  familyCode: string
  familyName: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string | null
  address: string | null
  studentCount: number
  students: { id: number; studentCode: string; name: string; gradeLevel: string }[]
  createdAt: string
}
