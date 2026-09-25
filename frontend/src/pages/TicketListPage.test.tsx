import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageResponse, TicketListItem } from '../types/ticket'
import TicketListPage from './TicketListPage'
import { renderWithProviders } from '../test/render'

vi.mock('../api/tickets', () => ({
  listTickets: vi.fn(),
}))

import { listTickets } from '../api/tickets'
import { ApiError } from '../api/client'

const listTicketsMock = vi.mocked(listTickets)

function page(content: TicketListItem[], overrides?: Partial<PageResponse<TicketListItem>>): PageResponse<TicketListItem> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    pageNumber: 0,
    ...overrides,
  }
}

const ticket: TicketListItem = {
  id: 42,
  title: 'Cannot login',
  status: 'OPEN',
  priority: 'HIGH',
  assignee: 'bob',
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
}

beforeEach(() => {
  listTicketsMock.mockReset()
})

describe('TicketListPage', () => {
  it('shows skeleton rows while loading', () => {
    listTicketsMock.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<TicketListPage />)

    expect(screen.getAllByTestId('skeleton-row').length).toBeGreaterThan(0)
  })

  it('renders populated rows with badges, assignee and relative time', async () => {
    listTicketsMock.mockResolvedValue(page([ticket]))

    renderWithProviders(<TicketListPage />)

    expect(await screen.findByText('Cannot login')).toBeInTheDocument()
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Open')
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('High')
    expect(screen.getByText('@bob')).toBeInTheDocument()
    expect(screen.getByText('2h ago')).toBeInTheDocument()
    expect(screen.getByText('1 ticket')).toBeInTheDocument()
  })

  it('shows the empty state with create CTA when there are no tickets', async () => {
    listTicketsMock.mockResolvedValue(page([]))

    renderWithProviders(<TicketListPage />)

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No tickets yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first ticket' })).toHaveAttribute(
      'href',
      '/tickets/new',
    )
  })

  it('shows clear-filters empty state when a filter yields no matches', async () => {
    listTicketsMock.mockResolvedValue(page([]))

    renderWithProviders(<TicketListPage />, { initialEntries: ['/?status=OPEN'] })

    expect(await screen.findByText('No tickets match your filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('shows the backend error message on failure', async () => {
    listTicketsMock.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Invalid status filter'),
    )

    renderWithProviders(<TicketListPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid status filter')
  })

  it('offers page sizes 10, 50 and 100', async () => {
    listTicketsMock.mockResolvedValue(page([ticket]))

    renderWithProviders(<TicketListPage />)

    const select = await screen.findByLabelText('Page size')
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).toEqual(['10 / page', '50 / page', '100 / page'])
  })

  it('requests the page and status from the URL', async () => {
    listTicketsMock.mockResolvedValue(page([ticket]))

    renderWithProviders(<TicketListPage />, {
      initialEntries: ['/?status=RESOLVED&page=2&size=50&keyword=login'],
    })

    await waitFor(() => expect(listTicketsMock).toHaveBeenCalled())
    expect(listTicketsMock).toHaveBeenCalledWith({
      status: 'RESOLVED',
      keyword: 'login',
      page: 2,
      size: 50,
    })
  })

  it('applies a status chip filter and resets the page to 0', async () => {
    const user = userEvent.setup()
    listTicketsMock.mockResolvedValue(page([ticket]))

    renderWithProviders(<TicketListPage />, { initialEntries: ['/?page=2'] })

    await screen.findByText('Cannot login')
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await waitFor(() =>
      expect(listTicketsMock).toHaveBeenLastCalledWith({
        status: 'OPEN',
        keyword: '',
        page: 0,
        size: 10,
      }),
    )
  })

  it('debounces keyword input before refetching', async () => {
    const user = userEvent.setup()
    listTicketsMock.mockResolvedValue(page([ticket]))

    renderWithProviders(<TicketListPage />)

    await screen.findByText('Cannot login')
    listTicketsMock.mockClear()
    await user.type(screen.getByLabelText('Filter by keyword'), 'login')

    await waitFor(
      () =>
        expect(listTicketsMock).toHaveBeenLastCalledWith({
          status: null,
          keyword: 'login',
          page: 0,
          size: 10,
        }),
      { timeout: 2000 },
    )
  })

  it('navigates pages with the pager', async () => {
    const user = userEvent.setup()
    listTicketsMock.mockResolvedValue(
      page([ticket], { totalPages: 3, totalElements: 30, pageNumber: 0 }),
    )

    renderWithProviders(<TicketListPage />)

    await screen.findByText('Page 1 of 3')
    await user.click(screen.getByRole('button', { name: 'Next →' }))

    await waitFor(() =>
      expect(listTicketsMock).toHaveBeenLastCalledWith({
        status: null,
        keyword: '',
        page: 1,
        size: 10,
      }),
    )
  })

  it('changes the page size and resets the page', async () => {
    const user = userEvent.setup()
    listTicketsMock.mockResolvedValue(page([ticket]))

    renderWithProviders(<TicketListPage />, { initialEntries: ['/?page=1'] })

    await screen.findByText('Cannot login')
    await user.selectOptions(screen.getByLabelText('Page size'), '100')

    await waitFor(() =>
      expect(listTicketsMock).toHaveBeenLastCalledWith({
        status: null,
        keyword: '',
        page: 0,
        size: 100,
      }),
    )
  })
})
