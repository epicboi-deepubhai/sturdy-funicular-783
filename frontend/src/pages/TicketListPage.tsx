import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { FilterBar, PAGE_SIZES } from '../components/FilterBar'
import { Pager } from '../components/Pager'
import { SkeletonRow } from '../components/Skeleton'
import { TicketRow } from '../components/TicketRow'
import { useTickets } from '../hooks/useTickets'
import type { TicketStatus } from '../types/ticket'
import { TICKET_STATUSES } from '../types/ticket'
import styles from './TicketListPage.module.css'

const DEFAULT_SIZE = 10

function parseStatus(raw: string | null): TicketStatus | null {
  return raw && (TICKET_STATUSES as readonly string[]).includes(raw) ? (raw as TicketStatus) : null
}

function parsePage(raw: string | null): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : 0
}

function parseSize(raw: string | null): number {
  const n = Number(raw)
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_SIZE
}

export default function TicketListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const keyword = searchParams.get('keyword') ?? ''
  const status = parseStatus(searchParams.get('status'))
  const page = parsePage(searchParams.get('page'))
  const size = parseSize(searchParams.get('size'))

  const { data, loading, error, retry } = useTickets({ status, keyword, page, size })

  /** Any filter change resets the page to 0; params stay in the URL (deep-linkable). */
  const updateParams = useCallback(
    (changes: Record<string, string | null>, resetPage = true) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') next.delete(key)
          else next.set(key, value)
        }
        if (resetPage) next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  const hasFilters = keyword.trim() !== '' || status !== null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tickets</h1>
        {data && !loading && (
          <span className={styles.count}>
            {data.totalElements} {data.totalElements === 1 ? 'ticket' : 'tickets'}
          </span>
        )}
      </header>

      <FilterBar
        keyword={keyword}
        status={status}
        size={size}
        onKeywordChange={(kw) => updateParams({ keyword: kw || null })}
        onStatusChange={(s) => updateParams({ status: s })}
        onSizeChange={(n) => updateParams({ size: n === DEFAULT_SIZE ? null : String(n) })}
      />

      {loading && (
        <div className={styles.rows} aria-label="Loading tickets">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retry} onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && data && data.content.length === 0 && (
        <EmptyState
          title={hasFilters ? 'No tickets match your filters' : 'No tickets yet'}
          body={
            hasFilters
              ? 'Try a different keyword or status filter.'
              : 'Tickets you create will show up here.'
          }
        >
          {hasFilters ? (
            <button
              type="button"
              className={styles.cta}
              onClick={() => updateParams({ keyword: null, status: null })}
            >
              Clear filters
            </button>
          ) : (
            <Link to="/tickets/new" className={styles.cta}>
              Create your first ticket
            </Link>
          )}
        </EmptyState>
      )}

      {!loading && !error && data && data.content.length > 0 && (
        <>
          <div className={styles.rows}>
            {data.content.map((ticket, i) => (
              <TicketRow key={ticket.id} ticket={ticket} index={i} />
            ))}
          </div>
          <Pager
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            onPageChange={(p) => updateParams({ page: p === 0 ? null : String(p) }, false)}
          />
        </>
      )}
    </div>
  )
}
