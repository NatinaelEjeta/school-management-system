import type { NextRequest } from 'next/server'
import { handleLogin } from '@/server/controllers/auth.controller'
import { handleApiError } from '@/server/errors'

export async function POST(req: NextRequest) {
  try {
    return await handleLogin(req)
  } catch (error) {
    return handleApiError(error)
  }
}
