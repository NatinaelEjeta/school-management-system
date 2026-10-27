import type { NextRequest } from 'next/server'
import { handleCreateTeacher, handleListTeachers } from '@/server/controllers/teachers.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleListTeachers(req)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleCreateTeacher(req)
  } catch (error) {
    return handleApiError(error)
  }
}
