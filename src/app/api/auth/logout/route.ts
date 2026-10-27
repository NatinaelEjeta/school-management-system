import { handleLogout } from '@/server/controllers/auth.controller'
import { handleApiError } from '@/server/errors'

export async function POST() {
  try {
    return handleLogout()
  } catch (error) {
    return handleApiError(error)
  }
}
