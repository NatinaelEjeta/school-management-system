import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/middleware/auth'
import { getDashboardStats } from '@/server/services/dashboard.service'
import type { DashboardStats } from '@/types/school'

/** GET /api/dashboard — aggregated stats for the admin dashboard. */
export async function handleDashboard(req: NextRequest): Promise<NextResponse<DashboardStats>> {
  await requireRole(req, 'ADMIN')
  return NextResponse.json(await getDashboardStats())
}
