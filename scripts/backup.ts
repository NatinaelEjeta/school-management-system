import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const db = new PrismaClient()

async function main(): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const data = {
    createdAt: new Date().toISOString(),
    user: await db.user.findMany(),
    teacher: await db.teacher.findMany(),
    family: await db.family.findMany(),
    schoolClass: await db.schoolClass.findMany(),
    student: await db.student.findMany(),
    course: await db.course.findMany(),
    enrollment: await db.enrollment.findMany(),
    attendance: await db.attendance.findMany(),
    grade: await db.grade.findMany(),
  }
  const dir = path.join(process.cwd(), 'backups')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'school-backup-' + stamp + '.json')
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
  const counts = Object.entries(data)
    .filter(([key]) => key !== 'createdAt')
    .map(([key, rows]) => key + ': ' + (rows as unknown[]).length)
    .join(', ')
  console.log('Backup saved to ' + file)
  console.log(counts)
}

main()
  .catch((error) => {
    console.error('Backup failed:', error)
    process.exit(1)
  })
  .finally(() => {
    void db.$disconnect()
  })