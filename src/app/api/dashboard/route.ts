import type { NextRequest } from 'next/server'
import { handleDashboard } from '@/server/controllers/dashboard.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleDashboard(req)
  } catch (error) {
    return handleApiError(error)
  }
}
