import type { TicketStatus } from '../types/ticket'

/** Human labels for statuses, shared by filter chips and controls. */
export const STATUS_FILTER_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
}
