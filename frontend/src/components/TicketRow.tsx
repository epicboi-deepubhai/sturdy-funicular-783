import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { TicketListItem } from '../types/ticket'
import { formatAbsoluteTime, formatRelativeTime } from '../utils/time'
import { PriorityBadge, StatusBadge } from './Badge'
import styles from './TicketRow.module.css'

interface TicketRowProps {
  ticket: TicketListItem
  index: number
}

export function TicketRow({ ticket, index }: TicketRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/tickets/${ticket.id}`} className={styles.row}>
        <span className={styles.title}>{ticket.title}</span>
        <span className={styles.meta}>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className={styles.assignee}>@{ticket.assignee}</span>
          <span className={styles.time} title={formatAbsoluteTime(ticket.updatedAt)}>
            {formatRelativeTime(ticket.updatedAt)}
          </span>
        </span>
      </Link>
    </motion.div>
  )
}
