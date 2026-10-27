import type { NextRequest } from 'next/server'
import { handleMyGrades } from '@/server/controllers/grades.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleMyGrades(req)
  } catch (error) {
    return handleApiError(error)
  }
}
