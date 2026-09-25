import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
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
