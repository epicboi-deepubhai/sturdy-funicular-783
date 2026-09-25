import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createTicket } from '../api/tickets'
import { TicketForm } from '../components/TicketForm'
import type { TicketFormValues } from '../components/TicketForm'
import { useErrorHandler } from '../hooks/useErrorHandler'
import type { CreateTicketRequest, FieldError } from '../types/ticket'
import styles from './CreateTicketPage.module.css'

export default function CreateTicketPage() {
  const navigate = useNavigate()
  const handleError = useErrorHandler()
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (values: TicketFormValues) => {
    setSubmitting(true)
    setFieldErrors([])
    setError(null)

    // Blank assignee is omitted entirely — the backend auto-assigns X-Username.
    const body: CreateTicketRequest = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      ...(values.assignee ? { assignee: values.assignee } : {}),
    }

    try {
      const created = await createTicket(body)
      navigate(`/tickets/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.fieldErrors?.length) {
        setFieldErrors(err.fieldErrors)
      }
      setError(handleError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>New ticket</h1>
        <p className={styles.helper}>New tickets start as OPEN</p>
      </header>

      {error && fieldErrors.length === 0 && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <TicketForm
        allowBlankAssignee
        submitLabel="Create ticket"
        submitting={submitting}
        fieldErrors={fieldErrors}
        onSubmit={onSubmit}
        onCancel={() => navigate('/')}
      />
    </div>
  )
}
