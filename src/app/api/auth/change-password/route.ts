import type { NextRequest } from 'next/server'
import { handleChangePassword } from '@/server/controllers/auth.controller'
import { handleApiError } from '@/server/errors'

export async function POST(req: NextRequest) {
  try {
    return await handleChangePassword(req)
  } catch (error) {
    return handleApiError(error)
  }
}