import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

/** Builds a readable ID such as STU-2026-0001 or TCH-2026-001. */
export function formatCode(prefix: string, year: number, sequence: number, width: number): string {
  return prefix + '-' + year + '-' + String(sequence).padStart(width, '0')
}

/** Reads the trailing number from a code (STU-2026-0007 gives 7). */
export function parseSequence(code: string): number {
  const last = code.split('-').pop() ?? ''
  const value = Number.parseInt(last, 10)
  return Number.isFinite(value) ? value : 0
}

export async function nextStudentCode(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const prefix = 'STU-' + year + '-'
  const last = await db.student.findFirst({
    where: { studentCode: { startsWith: prefix } },
    orderBy: { studentCode: 'desc' },
    select: { studentCode: true },
  })
  return formatCode('STU', year, last ? parseSequence(last.studentCode) + 1 : 1, 4)
}

export async function nextTeacherCode(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const prefix = 'TCH-' + year + '-'
  const last = await db.teacher.findFirst({
    where: { teacherCode: { startsWith: prefix } },
    orderBy: { teacherCode: 'desc' },
    select: { teacherCode: true },
  })
  return formatCode('TCH', year, last ? parseSequence(last.teacherCode) + 1 : 1, 3)
}

/** Retries when two requests picked the same code at the same moment (unique violation). */
export async function withCodeRetry<T>(action: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await action()
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        lastError = error
        continue
      }
      throw error
    }
  }
  throw lastError
}
export async function nextFamilyCode(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const prefix = 'FAM-' + year + '-'
  const last = await db.family.findFirst({
    where: { familyCode: { startsWith: prefix } },
    orderBy: { familyCode: 'desc' },
    select: { familyCode: true },
  })
  return formatCode('FAM', year, last ? parseSequence(last.familyCode) + 1 : 1, 4)
}
