import type { NextRequest } from 'next/server'
import { handleGetAttendanceSheet, handleSaveAttendance } from '@/server/controllers/attendance.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleGetAttendanceSheet(req)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleSaveAttendance(req)
  } catch (error) {
    return handleApiError(error)
  }
}
