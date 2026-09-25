import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api/client'
import { Shell } from './App'
import { renderWithProviders } from './test/render'

vi.mock('./api/tickets', () => ({
  listTickets: vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0 }),
  getTicket: vi.fn(),
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
  changeStatus: vi.fn(),
  addComment: vi.fn(),
}))

import { listTickets } from './api/tickets'

const listTicketsMock = vi.mocked(listTickets)

describe('App routing', () => {
  it('renders the not-found page with a link home for unknown routes', async () => {
    renderWithProviders(<Shell />, { initialEntries: ['/nope'] })

    expect(await screen.findByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to tickets' })).toHaveAttribute('href', '/')
  })

  it('renders the ticket list at /', async () => {
    renderWithProviders(<Shell />, { initialEntries: ['/'] })

    expect(await screen.findByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
  })
})

describe('Banner (FR11)', () => {
  it('shows a dismissible banner when the server cannot be reached', async () => {
    const user = userEvent.setup()
    listTicketsMock.mockRejectedValueOnce(
      new ApiError(0, 'NETWORK_ERROR', "Can't reach the server"),
    )

    renderWithProviders(<Shell />, { initialEntries: ['/'] })

    // Both the inline panel and the banner are alerts; the banner has a dismiss button.
    const alerts = await screen.findAllByRole('alert')
    const banner = alerts.find(
      (el) => within(el).queryByRole('button', { name: 'Dismiss' }) !== null,
    )
    expect(banner).toBeDefined()
    expect(banner).toHaveTextContent("Can't reach the server")

    await user.click(within(banner as HTMLElement).getByRole('button', { name: 'Dismiss' }))
    await waitFor(() =>
      expect(
        screen
          .queryAllByRole('alert')
          .every((el) => within(el).queryByRole('button', { name: 'Dismiss' }) === null),
      ).toBe(true),
    )
  })

  it('does not show the banner for validation errors', async () => {
    listTicketsMock.mockRejectedValueOnce(new ApiError(400, 'VALIDATION_ERROR', 'Bad filter'))

    renderWithProviders(<Shell />, { initialEntries: ['/'] })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Bad filter')
    expect(within(alert).queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
  })
})
