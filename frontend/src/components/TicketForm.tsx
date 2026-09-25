import { useState } from 'react'
import type { FormEvent } from 'react'
import { USERS } from '../hooks/useCurrentUser'
import type { FieldError, Priority } from '../types/ticket'
import { PRIORITIES } from '../types/ticket'
import styles from './TicketForm.module.css'

export const TITLE_MAX = 200
export const DESCRIPTION_MAX = 5000

export interface TicketFormValues {
  title: string
  description: string
  priority: Priority
  /** Empty string only when `allowBlankAssignee` (create flow: backend auto-assigns). */
  assignee: string
}

interface TicketFormProps {
  initial?: Partial<TicketFormValues>
  allowBlankAssignee?: boolean
  submitLabel: string
  submitting: boolean
  /** Server-side 400 fieldErrors, rendered under the matching field. */
  fieldErrors?: FieldError[]
  onSubmit: (values: TicketFormValues) => void
  onCancel: () => void
}

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export function TicketForm({
  initial,
  allowBlankAssignee = false,
  submitLabel,
  submitting,
  fieldErrors = [],
  onSubmit,
  onCancel,
}: TicketFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'MEDIUM')
  const [assignee, setAssignee] = useState(initial?.assignee ?? '')
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  const serverError = (field: string) => fieldErrors.find((e) => e.field === field)?.message
  const errorFor = (field: string) => clientErrors[field] ?? serverError(field)

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle) errors.title = 'Title is required'
    else if (trimmedTitle.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters`
    if (!trimmedDescription) errors.description = 'Description is required'
    else if (trimmedDescription.length > DESCRIPTION_MAX)
      errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`
    setClientErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ title: title.trim(), description: description.trim(), priority, assignee })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ticket-title">
          Title
        </label>
        <input
          id="ticket-title"
          className={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX + 50}
          placeholder="What's the issue?"
        />
        {errorFor('title') && <p className={styles.fieldError}>{errorFor('title')}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ticket-description">
          Description
        </label>
        <textarea
          id="ticket-description"
          className={styles.textarea}
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Steps to reproduce, expected vs actual, context…"
        />
        {errorFor('description') && <p className={styles.fieldError}>{errorFor('description')}</p>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <span className={styles.label} id="priority-label">
            Priority
          </span>
          <div className={styles.segmented} role="radiogroup" aria-labelledby="priority-label">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={p === priority}
                className={`${styles.segment} ${p === priority ? styles.activeSegment : ''}`}
                onClick={() => setPriority(p)}
              >
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
          {errorFor('priority') && <p className={styles.fieldError}>{errorFor('priority')}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ticket-assignee">
            Assignee
          </label>
          <select
            id="ticket-assignee"
            className={styles.select}
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            {allowBlankAssignee && <option value="">Assign to me</option>}
            {USERS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          {errorFor('assignee') && <p className={styles.fieldError}>{errorFor('assignee')}</p>}
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
