import type { ApiErrorBody, FieldError } from '../types/ticket'

/**
 * Error thrown for every non-2xx response and for network failures.
 * `status === 0` means the request never reached the server (FR11) —
 * the shell banner uses this to show "Can't reach the server".
 */
export class ApiError extends Error {
  readonly status: number
  readonly error: string
  readonly fieldErrors?: FieldError[]

  constructor(status: number, error: string, message: string, fieldErrors?: FieldError[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.error = error
    this.fieldErrors = fieldErrors
  }
}

export type UsernameGetter = () => string

let getUsername: UsernameGetter = () => 'alice'

/** Called once by the app shell so every request carries the current user. */
export function registerUsernameGetter(getter: UsernameGetter): void {
  getUsername = getter
}

const baseUrl = (): string => import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

async function parseErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return null
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Username': getUsername(),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server")
  }

  if (!response.ok) {
    const body = await parseErrorBody(response)
    throw new ApiError(
      response.status,
      body?.error ?? 'UNKNOWN_ERROR',
      body?.message ?? `Request failed with status ${response.status}`,
      body?.fieldErrors,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}
