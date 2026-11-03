import type { NextRequest } from 'next/server'
import { handleListClasses } from '@/server/controllers/classes.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleListClasses(req)
  } catch (error) {
    return handleApiError(error)
  }
}