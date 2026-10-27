import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/server/validation'
import { login } from '@/server/services/auth.service'
import { authenticate } from '@/server/middleware/auth'
import { readJsonBody } from '@/server/http'
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS } from '@/server/auth/tokens'
import type { LoginResponse } from '@/types/school'

/** POST /api/auth/login — validate credentials, set the httpOnly session cookie. */
export async function handleLogin(req: NextRequest): Promise<NextResponse<LoginResponse>> {
  const input = loginSchema.parse(await readJsonBody(req))
  const result = await login(input.email, input.password)
  const response = NextResponse.json(result)
  response.cookies.set(AUTH_COOKIE, result.token, AUTH_COOKIE_OPTIONS)
  return response
}

/** POST /api/auth/logout — clear the session cookie. */
export function handleLogout(): NextResponse<{ message: string }> {
  const response = NextResponse.json({ message: 'Signed out successfully.' })
  response.cookies.set(AUTH_COOKIE, '', { ...AUTH_COOKIE_OPTIONS, maxAge: 0 })
  return response
}

/** GET /api/auth/me — current session user (401 when signed out). */
export async function handleMe(req: NextRequest): Promise<NextResponse> {
  const user = await authenticate(req)
  return NextResponse.json(user)
}
