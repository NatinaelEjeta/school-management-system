import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(3, 'Email is required')
  .max(120, 'Email is too long')
  .email('Enter a valid email address')

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use the YYYY-MM-DD format')

const idSchema = z.number().int('Must be a whole number').positive('Must be a positive number')

const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const studentCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  gradeLevel: z.string().trim().min(1, 'Grade level is required').max(30, 'Grade level is too long'),
  dateOfBirth: dateSchema.nullish(),
})

export const studentUpdateSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  gradeLevel: z.string().trim().min(1, 'Grade level is required').max(30, 'Grade level is too long').optional(),
  dateOfBirth: dateSchema.nullish(),
})

export const teacherCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const teacherUpdateSchema = teacherCreateSchema.partial()

export const courseCreateSchema = z.object({
  name: z.string().trim().min(2, 'Course name must be at least 2 characters').max(100, 'Course name is too long'),
  teacherId: idSchema.nullish(),
})

export const courseUpdateSchema = courseCreateSchema.partial()

export const enrollSchema = z.object({
  studentId: idSchema,
})

export const attendanceSaveSchema = z.object({
  courseId: idSchema,
  date: dateSchema,
  records: z
    .array(
      z.object({
        enrollmentId: idSchema,
        status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
      }),
    )
    .min(1, 'At least one attendance record is required')
    .max(300, 'Too many attendance records in one request'),
})

export const gradeCreateSchema = z
  .object({
    enrollmentId: idSchema,
    assessmentName: z.string().trim().min(1, 'Assessment name is required').max(80, 'Assessment name is too long'),
    score: z.number().min(0, 'Score cannot be negative'),
    maxScore: z.number().min(1, 'Max score must be at least 1'),
  })
  .refine((value) => value.score <= value.maxScore, {
    message: 'Score cannot exceed the max score',
    path: ['score'],
  })

export interface StudentCreateInput {
  name: string
  email: string
  password: string
  gradeLevel: string
  dateOfBirth?: string | null
}

export interface StudentUpdateInput {
  name?: string
  email?: string
  password?: string
  gradeLevel?: string
  dateOfBirth?: string | null
}

export interface TeacherCreateInput {
  name: string
  email: string
  password: string
}

export interface TeacherUpdateInput {
  name?: string
  email?: string
  password?: string
}

export interface CourseCreateInput {
  name: string
  teacherId?: number | null
}

export interface CourseUpdateInput {
  name?: string
  teacherId?: number | null
}

export interface GradeCreateInput {
  enrollmentId: number
  assessmentName: string
  score: number
  maxScore: number
}

export interface AttendanceSaveInput {
  courseId: number
  date: string
  records: { enrollmentId: number; status: 'PRESENT' | 'ABSENT' | 'LATE' }[]
}
