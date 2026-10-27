import jwt from 'jsonwebtoken'
import { ApiError } from '@/server/errors'

export const AUTH_COOKIE = 'school_session'
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

interface TokenPayload {
  uid: number
  role: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new ApiError(500, 'Server is missing a valid JWT_SECRET configuration')
  }
  return secret
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret())
    if (typeof decoded === 'string') return null
    const { uid, role } = decoded as jwt.JwtPayload & TokenPayload
    if (typeof uid !== 'number' || typeof role !== 'string') return null
    return { uid, role }
  } catch {
    return null
  }
}

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: TOKEN_TTL_SECONDS,
  secure: process.env.NODE_ENV === 'production',
}
