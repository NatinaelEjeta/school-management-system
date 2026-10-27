import type { NextRequest } from 'next/server'
import { handleDeleteCourse, handleGetCourse, handleUpdateCourse } from '@/server/controllers/courses.controller'
import { handleApiError } from '@/server/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleGetCourse(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleUpdateCourse(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleDeleteCourse(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}
