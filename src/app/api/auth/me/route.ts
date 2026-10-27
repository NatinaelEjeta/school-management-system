import type { NextRequest } from 'next/server'
import { handleMe } from '@/server/controllers/auth.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleMe(req)
  } catch (error) {
    return handleApiError(error)
  }
}
