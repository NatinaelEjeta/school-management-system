import type { NextRequest } from 'next/server'
import { handleMyAttendance } from '@/server/controllers/attendance.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleMyAttendance(req)
  } catch (error) {
    return handleApiError(error)
  }
}
