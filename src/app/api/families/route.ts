import type { NextRequest } from 'next/server'
import { handleCreateFamily, handleListFamilies } from '@/server/controllers/families.controller'
import { handleApiError } from '@/server/errors'

export async function GET(req: NextRequest) {
  try {
    return await handleListFamilies(req)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleCreateFamily(req)
  } catch (error) {
    return handleApiError(error)
  }
}