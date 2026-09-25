import type { Priority, TicketStatus } from '../types/ticket'
import styles from './Badge.module.css'

const STATUS_CLASS: Record<TicketStatus, string> = {
  OPEN: styles.statusOpen,
  IN_PROGRESS: styles.statusInProgress,
  RESOLVED: styles.statusResolved,
  CLOSED: styles.statusClosed,
  CANCELLED: styles.statusCancelled,
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
}

const PRIORITY_CLASS: Record<Priority, string> = {
  LOW: styles.priorityLow,
  MEDIUM: styles.priorityMedium,
  HIGH: styles.priorityHigh,
  URGENT: styles.priorityUrgent,
}

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`${styles.badge} ${STATUS_CLASS[status]}`} data-testid="status-badge">
      {STATUS_LABEL[status]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`${styles.badge} ${PRIORITY_CLASS[priority]}`} data-testid="priority-badge">
      {PRIORITY_LABEL[priority]}
    </span>
  )
}
