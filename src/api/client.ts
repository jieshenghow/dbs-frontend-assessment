import type {ApiErrorBody} from '@/api/types'

const BASE_URL = import.meta.env.BASE_URL

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  readonly meta?: Record<string, unknown>

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error.message ?? `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.error.code ?? 'UNKNOWN'
    this.fields = body?.error.fields
    this.meta = body?.error.meta
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path.replace(/^\//, '')}`
  const response = await fetch(url, init)
  const body = (await response.json().catch(() => null)) as T | ApiErrorBody | null

  if (!response.ok) {
    throw new ApiError(response.status, body as ApiErrorBody | null)
  }

  if (body === null) {
    throw new Error('The server returned an invalid response.')
  }

  return body as T
}
