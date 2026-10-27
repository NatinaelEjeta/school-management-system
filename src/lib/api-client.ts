import type { ApiErrorBody } from '@/types/school'

/** Error thrown for non-2xx API responses — carries the server's message and status. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: { path: string; message: string }[],
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiClientError('Network error — could not reach the server.', 0)
  }

  if (!response.ok) {
    let payload: ApiErrorBody | null = null
    try {
      payload = (await response.json()) as ApiErrorBody
    } catch {
      payload = null
    }
    const detail = payload?.details?.[0]?.message
    throw new ApiClientError(
      payload?.message ?? (detail ?? `Request failed with status ${response.status}.`),
      response.status,
      payload?.details,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
  delete: <T>(url: string) => request<T>('DELETE', url),
}

export function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') search.set(key, `${value}`)
  }
  const query = search.toString()
  return query === '' ? '' : `?${query}`
}
