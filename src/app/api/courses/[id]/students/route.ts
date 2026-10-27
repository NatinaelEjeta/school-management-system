import type { NextRequest } from 'next/server'
import { handleEnrollStudent, handleCourseStudents } from '@/server/controllers/courses.controller'
import { handleApiError } from '@/server/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleCourseStudents(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleEnrollStudent(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}
