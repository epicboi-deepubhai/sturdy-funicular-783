/**
 * Types mirroring spec/api-contract.md. Field names are camelCase JSON names.
 * Enums are union literals of the JSON names (never ordinals).
 */

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]

export const PRIORITIES: readonly Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export interface TicketListItem {
  id: number
  title: string
  status: TicketStatus
  priority: Priority
  assignee: string
  updatedAt: string
}

export interface CommentResponse {
  id: number
  body: string
  author: string
  createdAt: string
}

export interface TicketDetail {
  id: number
  title: string
  description: string
  status: TicketStatus
  priority: Priority
  assignee: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  comments: CommentResponse[]
}

/** Spring page fields required by project rules; extra fields may be present. */
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  pageNumber: number
}

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: FieldError[]
}

export interface CreateTicketRequest {
  title: string
  description: string
  priority: Priority
  /** Omitted entirely when the backend should auto-assign to X-Username. */
  assignee?: string
}

export interface UpdateTicketRequest {
  title?: string
  description?: string
  priority?: Priority
  assignee?: string
}

export interface ChangeStatusRequest {
  status: TicketStatus
}

export interface AddCommentRequest {
  body: string
}

/**
 * Legal transitions per spec/state-machine.md. Same-status is not a transition.
 * Single source of truth for the status control on the detail page.
 */
export const ALLOWED_NEXT: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
}

export const TERMINAL_STATUSES: readonly TicketStatus[] = ['CLOSED', 'CANCELLED']

export function isTerminal(status: TicketStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}
