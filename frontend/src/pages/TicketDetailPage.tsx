import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '../components/Badge'
import { CommentComposer } from '../components/CommentComposer'
import { CommentThread } from '../components/CommentThread'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/Skeleton'
import { StatusControl } from '../components/StatusControl'
import { TicketEditPanel } from '../components/TicketEditPanel'
import { useBanner } from '../hooks/useBanner'
import { useTicket } from '../hooks/useTicket'
import { isTerminal } from '../types/ticket'
import { formatAbsoluteTime, formatRelativeTime } from '../utils/time'
import styles from './TicketDetailPage.module.css'

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showBanner } = useBanner()
  const { ticket, loading, error, notFound, accessLost, refetch, setTicket } =
    useTicket(Number(id))

  useEffect(() => {
    if (!accessLost) return
    showBanner('Ticket not found')
    navigate('/', { replace: true })
  }, [accessLost, navigate, showBanner])

  if (accessLost) return null

  if (loading) {
    return (
      <div className={styles.page} aria-label="Loading ticket">
        <Skeleton width="120px" height="24px" />
        <Skeleton width="60%" height="32px" />
        <Skeleton width="100%" height="120px" />
        <Skeleton width="100%" height="200px" />
      </div>
    )
  }

  if (notFound) {
    return (
      <EmptyState
        title="Ticket not found"
        body={`No ticket with id ${id} exists. It may have never existed.`}
      >
        <Link to="/" className={styles.homeLink}>
          Back to tickets
        </Link>
      </EmptyState>
    )
  }

  if (error || !ticket) {
    return (
      <div className={styles.errorPanel} role="alert">
        <p className={styles.errorMessage}>{error ?? 'Something went wrong'}</p>
        <button type="button" className={styles.retry} onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    )
  }

  const terminal = isTerminal(ticket.status)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <StatusBadge status={ticket.status} />
          <span className={styles.id}>#{ticket.id}</span>
        </div>
        <h1 className={styles.title}>{ticket.title}</h1>
        <div className={styles.meta}>
          <PriorityBadge priority={ticket.priority} />
          <span className={styles.metaItem}>
            assigned to <strong>@{ticket.assignee}</strong>
          </span>
          <span className={styles.metaItem}>created by {ticket.createdBy}</span>
          <span className={styles.metaItem}>updated by {ticket.updatedBy}</span>
          <span className={styles.metaItem} title={formatAbsoluteTime(ticket.createdAt)}>
            created {formatRelativeTime(ticket.createdAt)}
          </span>
          <span className={styles.metaItem} title={formatAbsoluteTime(ticket.updatedAt)}>
            updated {formatRelativeTime(ticket.updatedAt)}
          </span>
        </div>
        <StatusControl ticket={ticket} onChanged={setTicket} />
      </header>

      <section className={styles.section} aria-label="Description">
        <h2 className={styles.sectionTitle}>Description</h2>
        <p className={styles.description}>{ticket.description}</p>
      </section>

      {!terminal && <TicketEditPanel ticket={ticket} onSaved={setTicket} />}

      <section className={styles.section} aria-label="Comments">
        <h2 className={styles.sectionTitle}>
          Comments <span className={styles.commentCount}>{ticket.comments.length}</span>
        </h2>
        <CommentThread comments={ticket.comments} />
        {ticket.status !== 'CANCELLED' && (
          <div className={styles.composerWrap}>
            <CommentComposer ticketId={ticket.id} onCommented={() => void refetch()} />
          </div>
        )}
      </section>
    </div>
  )
}
