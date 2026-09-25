import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { TicketDetail } from '../types/ticket'
import CreateTicketPage from './CreateTicketPage'
import { renderWithProviders } from '../test/render'

vi.mock('../api/tickets', () => ({
  createTicket: vi.fn(),
}))

import { createTicket } from '../api/tickets'

const createTicketMock = vi.mocked(createTicket)

const created: TicketDetail = {
  id: 7,
  title: 'Cannot login',
  description: 'SSO redirect loops.',
  status: 'OPEN',
  priority: 'HIGH',
  assignee: 'alice',
  createdBy: 'alice',
  updatedBy: 'alice',
  createdAt: '2026-09-25T10:15:30Z',
  updatedAt: '2026-09-25T10:15:30Z',
  comments: [],
}

function renderCreate() {
  return renderWithProviders(
    <Routes>
      <Route path="/tickets/new" element={<CreateTicketPage />} />
      <Route path="/tickets/:id" element={<div>detail page</div>} />
      <Route path="/" element={<div>list page</div>} />
    </Routes>,
    { initialEntries: ['/tickets/new'] },
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Title'), 'Cannot login')
  await user.type(screen.getByLabelText('Description'), 'SSO redirect loops.')
}

beforeEach(() => {
  createTicketMock.mockReset()
})

describe('CreateTicketPage', () => {
  it('omits blank assignee and never sends a status key', async () => {
    const user = userEvent.setup()
    createTicketMock.mockResolvedValue(created)
    renderCreate()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create ticket' }))

    await waitFor(() => expect(createTicketMock).toHaveBeenCalled())
    const body = createTicketMock.mock.calls[0][0]
    expect(body).toEqual({
      title: 'Cannot login',
      description: 'SSO redirect loops.',
      priority: 'MEDIUM',
    })
    expect(body).not.toHaveProperty('assignee')
    expect(body).not.toHaveProperty('status')
  })

  it('navigates to the new ticket on success', async () => {
    const user = userEvent.setup()
    createTicketMock.mockResolvedValue(created)
    renderCreate()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create ticket' }))

    expect(await screen.findByText('detail page')).toBeInTheDocument()
  })

  it('sends a chosen assignee and priority', async () => {
    const user = userEvent.setup()
    createTicketMock.mockResolvedValue(created)
    renderCreate()

    await fillValidForm(user)
    await user.click(screen.getByRole('radio', { name: 'Urgent' }))
    await user.selectOptions(screen.getByLabelText('Assignee'), 'carol')
    await user.click(screen.getByRole('button', { name: 'Create ticket' }))

    await waitFor(() => expect(createTicketMock).toHaveBeenCalled())
    expect(createTicketMock.mock.calls[0][0]).toMatchObject({
      priority: 'URGENT',
      assignee: 'carol',
    })
  })

  it('renders 400 fieldErrors under the matching fields', async () => {
    const user = userEvent.setup()
    createTicketMock.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { field: 'title', message: 'size must be between 1 and 200' },
        { field: 'description', message: 'must not be blank' },
      ]),
    )
    renderCreate()

    // Fill title only so client validation passes for it; description left
    // blank would fail client-side first, so fill both and let the server reject.
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create ticket' }))

    expect(await screen.findByText('size must be between 1 and 200')).toBeInTheDocument()
    expect(screen.getByText('must not be blank')).toBeInTheDocument()
  })

  it('blocks submit and shows client errors for blank fields', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(screen.getByRole('button', { name: 'Create ticket' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(createTicketMock).not.toHaveBeenCalled()
  })

  it('cancel navigates back to the list', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('list page')).toBeInTheDocument()
  })
})
