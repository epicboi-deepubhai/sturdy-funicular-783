import { request } from './client'
import type {
  AddCommentRequest,
  ChangeStatusRequest,
  CommentResponse,
  CreateTicketRequest,
  PageResponse,
  TicketDetail,
  TicketListItem,
  TicketStatus,
  UpdateTicketRequest,
} from '../types/ticket'

const BASE = '/api/v1/tickets'

export interface ListTicketsParams {
  status?: TicketStatus | null
  keyword?: string
  page: number
  size: number
}

export function listTickets(params: ListTicketsParams): Promise<PageResponse<TicketListItem>> {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim())
  query.set('page', String(params.page))
  query.set('size', String(params.size))
  return request<PageResponse<TicketListItem>>(`${BASE}?${query.toString()}`)
}

export function getTicket(id: number): Promise<TicketDetail> {
  return request<TicketDetail>(`${BASE}/${id}`)
}

export function createTicket(body: CreateTicketRequest): Promise<TicketDetail> {
  return request<TicketDetail>(BASE, { method: 'POST', body: JSON.stringify(body) })
}

export function updateTicket(id: number, body: UpdateTicketRequest): Promise<TicketDetail> {
  return request<TicketDetail>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export function changeStatus(id: number, status: ChangeStatusRequest['status']): Promise<TicketDetail> {
  const body: ChangeStatusRequest = { status }
  return request<TicketDetail>(`${BASE}/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) })
}

export function addComment(id: number, body: AddCommentRequest): Promise<CommentResponse> {
  return request<CommentResponse>(`${BASE}/${id}/comments`, { method: 'POST', body: JSON.stringify(body) })
}
