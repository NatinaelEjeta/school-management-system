import type { NextRequest } from 'next/server'
import { handleDeleteStudent, handleGetStudent, handleUpdateStudent } from '@/server/controllers/students.controller'
import { handleApiError } from '@/server/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleGetStudent(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleUpdateStudent(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    return await handleDeleteStudent(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}
