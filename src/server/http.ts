import { ApiError } from '@/server/errors'

/** Safely parse a JSON request body. */
export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON')
  }
}

/** Parse and validate a numeric route parameter (e.g. /api/students/[id]). */
export function parseIdParam(value: string, label = 'id'): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `Invalid ${label} parameter`)
  }
  return id
}

/** Clamp an integer query param between min and max, falling back to a default. */
export function parseIntParam(
  value: string | null,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  if (value === null || value.trim() === '') return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}
