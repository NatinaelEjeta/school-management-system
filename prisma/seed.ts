/**
 * Seed script for the Greenfield Academy School Management System.
 *
 * Creates: 1 admin, 3 teachers, 15 students, 5 courses,
 * 45 enrollments, sample attendance (last 10 weekdays) and grades.
 *
 * Run with: bun run db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

/** Deterministic PRNG so the seed data is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(20250115)

const ADMIN_PASSWORD = 'Admin123!'
const TEACHER_PASSWORD = 'Teacher123!'
const STUDENT_PASSWORD = 'Student123!'

const teachersData = [
  { name: 'Grace Mwangi', email: 'grace.mwangi@school.edu' },
  { name: 'David Ochieng', email: 'david.ochieng@school.edu' },
  { name: 'Fatima Hassan', email: 'fatima.hassan@school.edu' },
]

const studentsData: { name: string; gradeLevel: string; dateOfBirth: string }[] = [
  { name: 'Brian Otieno', gradeLevel: 'Grade 9', dateOfBirth: '2009-03-14' },
  { name: 'Cynthia Wanjiru', gradeLevel: 'Grade 10', dateOfBirth: '2008-07-02' },
  { name: 'Kevin Kiprop', gradeLevel: 'Grade 11', dateOfBirth: '2007-11-23' },
  { name: 'Aisha Mohammed', gradeLevel: 'Grade 9', dateOfBirth: '2009-05-30' },
  { name: 'Peter Kamau', gradeLevel: 'Grade 12', dateOfBirth: '2006-09-12' },
  { name: 'Lydia Achieng', gradeLevel: 'Grade 10', dateOfBirth: '2008-01-18' },
  { name: 'Samuel Njoroge', gradeLevel: 'Grade 11', dateOfBirth: '2007-04-05' },
  { name: 'Naomi Chelimo', gradeLevel: 'Grade 9', dateOfBirth: '2009-08-27' },
  { name: 'Daniel Mutiso', gradeLevel: 'Grade 12', dateOfBirth: '2006-12-01' },
  { name: 'Zainab Yusuf', gradeLevel: 'Grade 10', dateOfBirth: '2008-10-09' },
  { name: 'Eric Kariuki', gradeLevel: 'Grade 11', dateOfBirth: '2007-06-21' },
  { name: 'Faith Nduta', gradeLevel: 'Grade 9', dateOfBirth: '2009-02-11' },
  { name: 'Collins Barasa', gradeLevel: 'Grade 12', dateOfBirth: '2006-05-25' },
  { name: 'Mercy Chebet', gradeLevel: 'Grade 10', dateOfBirth: '2008-04-16' },
  { name: 'Ali Abdi', gradeLevel: 'Grade 11', dateOfBirth: '2007-09-08' },
]

/** Last N weekday dates (YYYY-MM-DD), ending yesterday, oldest first. */
function lastWeekdays(count: number): string[] {
  const days: string[] = []
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - 1)
  while (days.length < count) {
    const dayOfWeek = d.getUTCDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) days.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return days.reverse()
}

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.')}@school.edu`
}

async function main(): Promise<void> {
  console.log('Clearing existing data...')
  await db.$transaction([
    db.attendance.deleteMany(),
    db.grade.deleteMany(),
    db.enrollment.deleteMany(),
    db.course.deleteMany(),
    db.student.deleteMany(),
    db.teacher.deleteMany(),
    db.user.deleteMany(),
  ])

  const hash = (password: string): string => bcrypt.hashSync(password, 10)

  console.log('Creating users...')
  await db.user.create({
    data: { name: 'Amina Baraka', email: 'admin@school.edu', passwordHash: hash(ADMIN_PASSWORD), role: 'ADMIN' },
  })
  console.log('  admin@school.edu (ADMIN)')

  const teachers = []
  for (const t of teachersData) {
    teachers.push(
      await db.teacher.create({
        data: { user: { create: { name: t.name, email: t.email, passwordHash: hash(TEACHER_PASSWORD), role: 'TEACHER' } } },
      }),
    )
  }
  console.log(`  ${teachers.length} teachers`)

  const students = []
  for (const s of studentsData) {
    students.push(
      await db.student.create({
        data: {
          gradeLevel: s.gradeLevel,
          dateOfBirth: s.dateOfBirth,
          user: { create: { name: s.name, email: emailFor(s.name), passwordHash: hash(STUDENT_PASSWORD), role: 'STUDENT' } },
        },
      }),
    )
  }
  console.log(`  ${students.length} students`)

  console.log('Creating courses...')
  const coursesData = [
    { name: 'Mathematics', teacherId: teachers[0].id },
    { name: 'English Literature', teacherId: teachers[1].id },
    { name: 'Physics', teacherId: teachers[2].id },
    { name: 'Chemistry', teacherId: teachers[0].id },
    { name: 'History & Government', teacherId: teachers[1].id },
  ]
  const courses = []
  for (const c of coursesData) {
    courses.push(await db.course.create({ data: c }))
  }
  console.log(`  ${courses.length} courses`)

  console.log('Creating enrollments...')
  // 3 courses per student with an even rotation => 45 enrollments, 9 students per course.
  const enrollmentRows: { studentId: number; courseId: number }[] = []
  for (let i = 0; i < students.length; i++) {
    for (const offset of [0, 2, 4]) {
      const course = courses[(i + offset) % courses.length]
      enrollmentRows.push({ studentId: students[i].id, courseId: course.id })
    }
  }
  const enrollments = await db.$transaction(enrollmentRows.map((r) => db.enrollment.create({ data: r })))
  console.log(`  ${enrollments.length} enrollments`)

  console.log('Creating attendance...')
  const dates = lastWeekdays(10)
  const attendanceRows: { enrollmentId: number; date: string; status: string }[] = []
  for (const enrollment of enrollments) {
    for (const date of dates) {
      const r = rng()
      const status = r < 0.85 ? 'PRESENT' : r < 0.93 ? 'LATE' : 'ABSENT'
      attendanceRows.push({ enrollmentId: enrollment.id, date, status })
    }
  }
  await db.$transaction(attendanceRows.map((r) => db.attendance.create({ data: r })))
  console.log(`  ${attendanceRows.length} attendance records over ${dates.length} weekdays`)

  console.log('Creating grades...')
  const assessments = [
    { assessmentName: 'CAT 1', maxScore: 20 },
    { assessmentName: 'Midterm Exam', maxScore: 50 },
    { assessmentName: 'End-Term Exam', maxScore: 100 },
  ]
  const gradeRows: { enrollmentId: number; assessmentName: string; score: number; maxScore: number }[] = []
  for (const enrollment of enrollments) {
    for (const a of assessments) {
      const ratio = 0.55 + rng() * 0.4 // 55% .. 95%
      gradeRows.push({
        enrollmentId: enrollment.id,
        assessmentName: a.assessmentName,
        score: Math.round(a.maxScore * ratio * 100) / 100,
        maxScore: a.maxScore,
      })
    }
  }
  await db.$transaction(gradeRows.map((r) => db.grade.create({ data: r })))
  console.log(`  ${gradeRows.length} grade records`)

  console.log('\nSeed complete. Demo accounts:')
  console.log(`  Admin    — admin@school.edu / ${ADMIN_PASSWORD}`)
  console.log(`  Teacher  — grace.mwangi@school.edu / ${TEACHER_PASSWORD}`)
  console.log(`  Student  — brian.otieno@school.edu / ${STUDENT_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(() => {
    void db.$disconnect()
  })
