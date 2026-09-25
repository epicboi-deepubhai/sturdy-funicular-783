import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title: string
  body?: string
  children?: ReactNode
}

export function EmptyState({ title, body, children }: EmptyStateProps) {
  return (
    <div className={styles.empty} data-testid="empty-state">
      <div className={styles.artwork} aria-hidden="true" />
      <h2 className={styles.title}>{title}</h2>
      {body && <p className={styles.body}>{body}</p>}
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  )
}
