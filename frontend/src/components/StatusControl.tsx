import { useState } from 'react'
import { changeStatus } from '../api/tickets'
import { useErrorHandler } from '../hooks/useErrorHandler'
import type { TicketDetail, TicketStatus } from '../types/ticket'
import { ALLOWED_NEXT } from '../types/ticket'
import { STATUS_FILTER_LABEL } from './statusLabels'
import styles from './StatusControl.module.css'

interface StatusControlProps {
  ticket: TicketDetail
  onChanged: (ticket: TicketDetail) => void
}

/** Buttons for legal next statuses only (ALLOWED_NEXT). Terminal = read-only label. */
export function StatusControl({ ticket, onChanged }: StatusControlProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleError = useErrorHandler()

  const allowed = ALLOWED_NEXT[ticket.status]

  if (allowed.length === 0) {
    return (
      <span className={styles.readOnly} data-testid="status-readonly">
        {STATUS_FILTER_LABEL[ticket.status]} — read-only
      </span>
    )
  }

  const transition = async (status: TicketStatus) => {
    setBusy(true)
    setError(null)
    try {
      onChanged(await changeStatus(ticket.id, status))
    } catch (err) {
      setError(handleError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.control}>
      <div className={styles.buttons} role="group" aria-label="Change status">
        {allowed.map((status) => (
          <button
            key={status}
            type="button"
            className={`${styles.button} ${status === 'CANCELLED' ? styles.danger : ''}`}
            disabled={busy}
            onClick={() => void transition(status)}
          >
            Mark as {STATUS_FILTER_LABEL[status]}
          </button>
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
