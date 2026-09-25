import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { Banner } from '../components/Banner'
import { UserSwitcher } from '../components/UserSwitcher'
import type { TicketDetail } from '../types/ticket'
import TicketDetailPage from './TicketDetailPage'
import { renderWithProviders } from '../test/render'

vi.mock('../api/tickets', () => ({
  getTicket: vi.fn(),
  changeStatus: vi.fn(),
  updateTicket: vi.fn(),
  addComment: vi.fn(),
}))

import { addComment, changeStatus, getTicket, updateTicket } from '../api/tickets'

const getTicketMock = vi.mocked(getTicket)
const changeStatusMock = vi.mocked(changeStatus)
const updateTicketMock = vi.mocked(updateTicket)
const addCommentMock = vi.mocked(addComment)

function ticket(overrides?: Partial<TicketDetail>): TicketDetail {
  return {
    id: 42,
    title: 'Cannot login',
    description: 'SSO redirect loops.',
    status: 'OPEN',
    priority: 'HIGH',
    assignee: 'bob',
    createdBy: 'alice',
    updatedBy: 'alice',
    createdAt: '2026-09-25T10:15:30Z',
    updatedAt: '2026-09-25T10:16:00Z',
    comments: [],
    ...overrides,
  }
}

function renderDetail(id = '42') {
  return renderWithProviders(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
    </Routes>,
    { initialEntries: [`/tickets/${id}`] },
  )
}

beforeEach(() => {
  localStorage.clear()
  getTicketMock.mockReset()
  changeStatusMock.mockReset()
  updateTicketMock.mockReset()
  addCommentMock.mockReset()
})

describe('TicketDetailPage', () => {
  it('renders the 404 empty state when the ticket does not exist', async () => {
    getTicketMock.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Ticket 42 not found'))

    renderDetail()

    expect(await screen.findByText('Ticket not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to tickets' })).toHaveAttribute('href', '/')
  })

  it('OPEN offers only In progress and Cancelled transitions', async () => {
    getTicketMock.mockResolvedValue(ticket({ status: 'OPEN' }))

    renderDetail()

    const group = await screen.findByRole('group', { name: 'Change status' })
    expect(screen.getByRole('button', { name: 'Mark as In progress' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as Cancelled' })).toBeInTheDocument()
    expect(group.querySelectorAll('button')).toHaveLength(2)
  })

  it('IN_PROGRESS offers Resolved and Cancelled', async () => {
    getTicketMock.mockResolvedValue(ticket({ status: 'IN_PROGRESS' }))

    renderDetail()

    const group = await screen.findByRole('group', { name: 'Change status' })
    expect(screen.getByRole('button', { name: 'Mark as Resolved' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as Cancelled' })).toBeInTheDocument()
    expect(group.querySelectorAll('button')).toHaveLength(2)
  })

  it('RESOLVED offers only Closed', async () => {
    getTicketMock.mockResolvedValue(ticket({ status: 'RESOLVED' }))

    renderDetail()

    const group = await screen.findByRole('group', { name: 'Change status' })
    expect(screen.getByRole('button', { name: 'Mark as Closed' })).toBeInTheDocument()
    expect(group.querySelectorAll('button')).toHaveLength(1)
  })

  it('CLOSED hides the edit panel but keeps the composer, with a read-only status label', async () => {
    getTicketMock.mockResolvedValue(ticket({ status: 'CLOSED' }))

    renderDetail()

    expect(await screen.findByTestId('status-readonly')).toHaveTextContent('Closed')
    expect(screen.queryByRole('button', { name: 'Edit ticket' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Comment')).toBeInTheDocument()
  })

  it('CANCELLED hides both the edit panel and the composer', async () => {
    getTicketMock.mockResolvedValue(ticket({ status: 'CANCELLED' }))

    renderDetail()

    expect(await screen.findByTestId('status-readonly')).toHaveTextContent('Cancelled')
    expect(screen.queryByRole('button', { name: 'Edit ticket' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument()
  })

  it('renders comments oldest first with authors', async () => {
    getTicketMock.mockResolvedValue(
      ticket({
        comments: [
          { id: 1, body: 'First note', author: 'alice', createdAt: '2026-09-25T10:16:00Z' },
          { id: 2, body: 'Second note', author: 'bob', createdAt: '2026-09-25T10:17:00Z' },
        ],
      }),
    )

    renderDetail()

    const thread = await screen.findByTestId('comment-thread')
    const items = thread.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('First note')
    expect(items[1]).toHaveTextContent('Second note')
  })

  it('shows the backend error message when the fetch fails', async () => {
    getTicketMock.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Bad id format'))

    renderDetail()

    expect(await screen.findByRole('alert')).toHaveTextContent('Bad id format')
  })

  it('shows the 409 message verbatim beside the status control', async () => {
    const user = userEvent.setup()
    getTicketMock.mockResolvedValue(ticket({ status: 'OPEN' }))
    changeStatusMock.mockRejectedValue(
      new ApiError(409, 'INVALID_STATE_TRANSITION', 'Cannot move ticket from CLOSED to OPEN'),
    )

    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Mark as In progress' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot move ticket from CLOSED to OPEN',
    )
  })

  it('applies a successful transition without a refetch', async () => {
    const user = userEvent.setup()
    getTicketMock.mockResolvedValue(ticket({ status: 'OPEN' }))
    changeStatusMock.mockResolvedValue(ticket({ status: 'IN_PROGRESS' }))

    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Mark as In progress' }))

    expect(changeStatusMock).toHaveBeenCalledWith(42, 'IN_PROGRESS')
    expect(await screen.findByRole('button', { name: 'Mark as Resolved' })).toBeInTheDocument()
  })

  it('posts a comment and refetches the thread', async () => {
    const user = userEvent.setup()
    getTicketMock.mockResolvedValue(ticket({}))
    addCommentMock.mockResolvedValue({
      id: 3,
      body: 'Reproduced on staging.',
      author: 'alice',
      createdAt: '2026-09-25T10:20:00Z',
    })

    renderDetail()

    await user.type(await screen.findByLabelText('Comment'), 'Reproduced on staging.')
    await user.click(screen.getByRole('button', { name: 'Comment' }))

    await waitFor(() =>
      expect(addCommentMock).toHaveBeenCalledWith(42, { body: 'Reproduced on staging.' }),
    )
    await waitFor(() => expect(getTicketMock).toHaveBeenCalledTimes(2))
  })

  it('shows the 409 message when commenting on a cancelled ticket', async () => {
    const user = userEvent.setup()
    // Race: ticket was OPEN when loaded, CANCELLED by the time we comment.
    getTicketMock.mockResolvedValue(ticket({ status: 'OPEN' }))
    addCommentMock.mockRejectedValue(
      new ApiError(409, 'COMMENTS_NOT_ALLOWED', 'Cannot comment on a cancelled ticket'),
    )

    renderDetail()

    await user.type(await screen.findByLabelText('Comment'), 'Still relevant?')
    await user.click(screen.getByRole('button', { name: 'Comment' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot comment on a cancelled ticket',
    )
  })

  it('saves edits with all four fields via PATCH', async () => {
    const user = userEvent.setup()
    const open = ticket({ status: 'OPEN' })
    getTicketMock.mockResolvedValue(open)
    updateTicketMock.mockResolvedValue({ ...open, title: 'Cannot login (SSO)' })

    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Edit ticket' }))
    const titleInput = screen.getByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Cannot login (SSO)')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(updateTicketMock).toHaveBeenCalledWith(42, {
        title: 'Cannot login (SSO)',
        description: 'SSO redirect loops.',
        priority: 'HIGH',
        assignee: 'bob',
      }),
    )
  })

  it('shows the 409 message when saving an edit on a terminal ticket', async () => {
    const user = userEvent.setup()
    getTicketMock.mockResolvedValue(ticket({ status: 'OPEN' }))
    updateTicketMock.mockRejectedValue(
      new ApiError(409, 'TICKET_READ_ONLY', 'Ticket is closed and read-only'),
    )

    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Edit ticket' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ticket is closed and read-only',
    )
  })

  it('refetches detail and stays on the page when the new user has access', async () => {
    const user = userEvent.setup()
    getTicketMock
      .mockResolvedValueOnce(ticket({ createdBy: 'alice', assignee: 'bob' }))
      .mockResolvedValueOnce(
        ticket({ createdBy: 'alice', assignee: 'bob', updatedBy: 'bob' }),
      )

    renderWithProviders(
      <>
        <UserSwitcher />
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </>,
      { initialEntries: ['/tickets/42'] },
    )

    expect(await screen.findByText('Cannot login')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'bob' }))

    await waitFor(() => expect(getTicketMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('updated by bob')).toBeInTheDocument()
  })

  it('redirects with a banner when a user switch loses ticket access', async () => {
    const user = userEvent.setup()
    getTicketMock
      .mockResolvedValueOnce(ticket({ createdBy: 'alice', assignee: 'bob' }))
      .mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Ticket 42 not found'))

    renderWithProviders(
      <>
        <UserSwitcher />
        <Banner />
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/" element={<div>Ticket list</div>} />
        </Routes>
      </>,
      { initialEntries: ['/tickets/42'] },
    )

    expect(await screen.findByText('Cannot login')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'carol' }))

    expect(await screen.findByText('Ticket list')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Ticket not found')
    expect(getTicketMock).toHaveBeenCalledTimes(2)
  })
})
