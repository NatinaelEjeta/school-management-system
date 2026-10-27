import type { NextRequest } from 'next/server'
import { handleReportCard } from '@/server/controllers/reports.controller'
import { handleApiError } from '@/server/errors'

type RouteContext = { params: Promise<{ studentId: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { studentId } = await ctx.params
    return await handleReportCard(req, studentId)
  } catch (error) {
    return handleApiError(error)
  }
}
