import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, registerUsernameGetter, request } from './client'
import { listTickets } from './tickets'

const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  registerUsernameGetter(() => 'bob')
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('attaches Content-Type and X-Username headers on GET', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))

    await request('/api/v1/tickets')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Username': 'bob',
    })
  })

  it('attaches X-Username on POST and serializes the body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 1 }))

    await request('/api/v1/tickets', { method: 'POST', body: JSON.stringify({ title: 'x' }) })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'X-Username': 'bob' })
    expect(init.body).toBe('{"title":"x"}')
  })

  it('throws ApiError with parsed fieldErrors on 400', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        timestamp: '2026-09-25T10:15:30Z',
        status: 400,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        path: '/api/v1/tickets',
        fieldErrors: [{ field: 'title', message: 'must not be blank' }],
      }),
    )

    const caught = await request('/api/v1/tickets').catch((e: unknown) => e)

    expect(caught).toBeInstanceOf(ApiError)
    const err = caught as ApiError
    expect(err.status).toBe(400)
    expect(err.error).toBe('VALIDATION_ERROR')
    expect(err.message).toBe('Validation failed')
    expect(err.fieldErrors).toEqual([{ field: 'title', message: 'must not be blank' }])
  })

  it('throws ApiError with status 0 on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const caught = await request('/api/v1/tickets').catch((e: unknown) => e)

    expect(caught).toBeInstanceOf(ApiError)
    expect((caught as ApiError).status).toBe(0)
    expect((caught as ApiError).message).toBe("Can't reach the server")
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 500 }))

    const caught = await request('/api/v1/tickets').catch((e: unknown) => e)

    expect(caught).toBeInstanceOf(ApiError)
    expect((caught as ApiError).status).toBe(500)
    expect((caught as ApiError).message).toBe('Request failed with status 500')
  })
})

describe('listTickets', () => {
  it('passes status, keyword, page and size as query params', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { content: [], totalElements: 0, totalPages: 0, pageNumber: 0 }),
    )

    await listTickets({ status: 'OPEN', keyword: 'login', page: 2, size: 50 })

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/tickets?')
    expect(url).toContain('status=OPEN')
    expect(url).toContain('keyword=login')
    expect(url).toContain('page=2')
    expect(url).toContain('size=50')
  })

  it('omits blank keyword and missing status', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { content: [], totalElements: 0, totalPages: 0, pageNumber: 0 }),
    )

    await listTickets({ keyword: '   ', page: 0, size: 10 })

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).not.toContain('status=')
    expect(url).not.toContain('keyword=')
    expect(url).toContain('page=0')
    expect(url).toContain('size=10')
  })
})
