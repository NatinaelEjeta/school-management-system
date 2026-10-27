import type { NextRequest } from 'next/server'
import { handleUnenrollStudent } from '@/server/controllers/courses.controller'
import { handleApiError } from '@/server/errors'

type RouteContext = { params: Promise<{ id: string; studentId: string }> }

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id, studentId } = await ctx.params
    return await handleUnenrollStudent(req, id, studentId)
  } catch (error) {
    return handleApiError(error)
  }
}
