import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import { signToken } from '@/server/auth/tokens'
import type { AuthUser, LoginResponse, Role } from '@/types/school'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await db.user.findUnique({ where: { email: normalizedEmail }, include: { student: true, teacher: true } })
  if (!user) throw new ApiError(401, 'Invalid email or password.')

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) throw new ApiError(401, 'Invalid email or password.')

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    studentId: user.student?.id ?? null,
    teacherId: user.teacher?.id ?? null,
  }
  const token = signToken({ uid: user.id, role: user.role })
  return { user: authUser, token }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}
