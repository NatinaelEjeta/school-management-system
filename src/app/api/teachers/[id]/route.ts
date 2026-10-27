import type { NextRequest } from 'next/server'
import { handleDeleteTeacher, handleUpdateTeacher } from '@/server/controllers/teachers.controller'
import { handleApiError } from '@/server/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleUpdateTeacher(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleDeleteTeacher(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}
