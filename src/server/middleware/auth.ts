import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ApiError } from '@/server/errors'
import { AUTH_COOKIE, verifyToken } from '@/server/auth/tokens'
import type { AuthUser, Role } from '@/types/school'

/**
 * Authentication middleware.
 * Reads the JWT from the httpOnly cookie or an `Authorization: Bearer` header,
 * then ALWAYS re-loads the user from the database — roles are never trusted
 * from the token alone (an admin can be demoted or deleted mid-session).
 */
export function extractToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  if (header && header.toLowerCase().startsWith('bearer ')) {
    const token = header.slice(7).trim()
    if (token) return token
  }
  return req.cookies.get(AUTH_COOKIE)?.value ?? null
}

export async function authenticate(req: NextRequest): Promise<AuthUser> {
  const token = extractToken(req)
  if (!token) throw new ApiError(401, 'Authentication required. Please sign in.')

  const payload = verifyToken(token)
  if (!payload) throw new ApiError(401, 'Your session is invalid or has expired. Please sign in again.')

  const user = await db.user.findUnique({ where: { id: payload.uid }, include: { student: true, teacher: true } })
  if (!user) throw new ApiError(401, 'This account no longer exists.')

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    studentId: user.student?.id ?? null,
    teacherId: user.teacher?.id ?? null,
  }
}

/** Authorization middleware — enforces the allowed roles on the server for every route. */
export async function requireRole(req: NextRequest, ...roles: Role[]): Promise<AuthUser> {
  const user = await authenticate(req)
  if (!roles.includes(user.role)) {
    throw new ApiError(403, 'You do not have permission to access this resource.')
  }
  return user
}

/**
 * Course-level access control:
 * - ADMIN: always allowed
 * - TEACHER: must own the course
 * - STUDENT: only when `allowStudent` and enrolled in the course
 */
export async function assertCourseAccess(
  user: AuthUser,
  courseId: number,
  opts: { allowStudent?: boolean } = {},
): Promise<void> {
  if (user.role === 'ADMIN') return

  if (user.role === 'TEACHER') {
    if (user.teacherId === null) throw new ApiError(403, 'No teacher profile is linked to this account.')
    const course = await db.course.findUnique({ where: { id: courseId }, select: { teacherId: true } })
    if (!course) throw new ApiError(404, 'Course not found.')
    if (course.teacherId !== user.teacherId) throw new ApiError(403, 'You can only access your own courses.')
    return
  }

  if (user.role === 'STUDENT' && opts.allowStudent) {
    if (user.studentId === null) throw new ApiError(403, 'No student profile is linked to this account.')
    const enrollment = await db.enrollment.findFirst({
      where: { courseId, studentId: user.studentId },
      select: { id: true },
    })
    if (!enrollment) throw new ApiError(403, 'You are not enrolled in this course.')
    return
  }

  throw new ApiError(403, 'You do not have permission to access this resource.')
}
