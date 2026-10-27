import type { NextRequest } from 'next/server'
import { handleAddGrade, handleListCourseGrades } from '@/server/controllers/grades.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleListCourseGrades(req)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleAddGrade(req)
  } catch (error) {
    return handleApiError(error)
  }
}
