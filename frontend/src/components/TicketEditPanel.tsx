import { useState } from 'react'
import { ApiError } from '../api/client'
import { updateTicket } from '../api/tickets'
import { useErrorHandler } from '../hooks/useErrorHandler'
import type { FieldError, TicketDetail, UpdateTicketRequest } from '../types/ticket'
import { TicketForm } from './TicketForm'
import type { TicketFormValues } from './TicketForm'
import styles from './TicketEditPanel.module.css'

interface TicketEditPanelProps {
  ticket: TicketDetail
  onSaved: (ticket: TicketDetail) => void
}

/** Field editing. Caller hides this entirely for CLOSED/CANCELLED tickets. */
export function TicketEditPanel({ ticket, onSaved }: TicketEditPanelProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])
  const [error, setError] = useState<string | null>(null)
  const handleError = useErrorHandler()

  const onSubmit = async (values: TicketFormValues) => {
    setSubmitting(true)
    setFieldErrors([])
    setError(null)

    const body: UpdateTicketRequest = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      assignee: values.assignee,
    }

    try {
      onSaved(await updateTicket(ticket.id, body))
      setOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.fieldErrors?.length) {
        setFieldErrors(err.fieldErrors)
      }
      setError(handleError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className={styles.toggle} onClick={() => setOpen(true)}>
        Edit ticket
      </button>
    )
  }

  return (
    <section className={styles.panel} aria-label="Edit ticket">
      <h2 className={styles.heading}>Edit ticket</h2>
      {error && fieldErrors.length === 0 && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <TicketForm
        initial={{
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          assignee: ticket.assignee,
        }}
        submitLabel="Save changes"
        submitting={submitting}
        fieldErrors={fieldErrors}
        onSubmit={onSubmit}
        onCancel={() => setOpen(false)}
      />
    </section>
  )
}
