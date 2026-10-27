import type { NextRequest } from 'next/server'
import { handleCreateStudent, handleListStudents } from '@/server/controllers/students.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleListStudents(req)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleCreateStudent(req)
  } catch (error) {
    return handleApiError(error)
  }
}
