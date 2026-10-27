import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import type { ApiErrorBody } from '@/types/school'

/** Domain error carrying an HTTP status — thrown by services/controllers. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details: { path: string; message: string }[] | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Centralized error handler: every route wraps its body in try/catch and delegates here. */
export function handleApiError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json({ message: error.message, ...(error.details ? { details: error.details } : {}) }, { status: error.status })
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.map(String).join('.') || '(root)',
      message: issue.message,
    }))
    return NextResponse.json({ message: 'Validation failed', details }, { status: 400 })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json({ message: 'A record with these details already exists.' }, { status: 409 })
      case 'P2025':
        return NextResponse.json({ message: 'Record not found.' }, { status: 404 })
      case 'P2003':
        return NextResponse.json({ message: 'A related record was not found.' }, { status: 400 })
      default:
        break
    }
  }

  console.error('[api] Unhandled error:', error)
  return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
}
