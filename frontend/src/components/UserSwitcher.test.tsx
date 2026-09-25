import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../api/client'
import { UserSwitcher } from './UserSwitcher'
import { CurrentUserProvider } from '../hooks/useCurrentUser'

function renderSwitcher() {
  return render(
    <CurrentUserProvider>
      <UserSwitcher />
    </CurrentUserProvider>,
  )
}

describe('UserSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to alice when nothing is stored', () => {
    renderSwitcher()

    expect(screen.getByRole('radio', { name: 'alice' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'bob' })).toHaveAttribute('aria-checked', 'false')
  })

  it('switches user and persists to localStorage', async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole('radio', { name: 'carol' }))

    expect(screen.getByRole('radio', { name: 'carol' })).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem('sf-user')).toBe('carol')
  })

  it('uses the new username on the first request after switching', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderSwitcher()

    await user.click(screen.getByRole('radio', { name: 'bob' }))
    await request('/api/v1/tickets')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({ 'X-Username': 'bob' })
  })

  it('restores the stored user on mount', () => {
    localStorage.setItem('sf-user', 'bob')

    renderSwitcher()

    expect(screen.getByRole('radio', { name: 'bob' })).toHaveAttribute('aria-checked', 'true')
  })

  it('ignores a stored value outside the allowlist', () => {
    localStorage.setItem('sf-user', 'mallory')

    renderSwitcher()

    expect(screen.getByRole('radio', { name: 'alice' })).toHaveAttribute('aria-checked', 'true')
  })
})
