import type { NextRequest } from 'next/server'
import { handleCreateCourse, handleListCourses } from '@/server/controllers/courses.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleListCourses(req)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleCreateCourse(req)
  } catch (error) {
    return handleApiError(error)
  }
}
