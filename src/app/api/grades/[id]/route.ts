import type { NextRequest } from 'next/server'
import { handleDeleteGrade } from '@/server/controllers/grades.controller'
import { handleApiError } from '@/server/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleDeleteGrade(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}
