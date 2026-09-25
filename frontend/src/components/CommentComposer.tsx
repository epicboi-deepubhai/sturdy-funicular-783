import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { addComment } from '../api/tickets'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useErrorHandler } from '../hooks/useErrorHandler'
import styles from './CommentComposer.module.css'

export const COMMENT_MAX = 2000

interface CommentComposerProps {
  ticketId: number
  onCommented: () => void
}

export function CommentComposer({ ticketId, onCommented }: CommentComposerProps) {
  const { username } = useCurrentUser()
  const handleError = useErrorHandler()
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) {
      setError('Comment cannot be blank')
      return
    }
    if (trimmed.length > COMMENT_MAX) {
      setError(`Comment must be at most ${COMMENT_MAX} characters`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await addComment(ticketId, { body: trimmed })
      setBody('')
      onCommented()
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.fieldErrors?.length) {
        setError(err.fieldErrors.map((f) => f.message).join('; '))
      } else {
        setError(handleError(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.composer} onSubmit={(e) => void submit(e)}>
      <textarea
        className={styles.input}
        rows={3}
        placeholder="Add a comment…"
        aria-label="Comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className={styles.footer}>
        <span className={styles.identity}>Commenting as {username}</span>
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Posting…' : 'Comment'}
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
