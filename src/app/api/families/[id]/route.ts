import type { NextRequest } from 'next/server'
import { handleDeleteFamily, handleGetFamily, handleUpdateFamily } from '@/server/controllers/families.controller'
import { handleApiError } from '@/server/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    return await handleGetFamily(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    return await handleUpdateFamily(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    return await handleDeleteFamily(req, id)
  } catch (error) {
    return handleApiError(error)
  }
}