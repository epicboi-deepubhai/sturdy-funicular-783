import { useEffect, useState } from 'react'
import type { TicketStatus } from '../types/ticket'
import { TICKET_STATUSES } from '../types/ticket'
import { STATUS_FILTER_LABEL } from './statusLabels'
import styles from './FilterBar.module.css'

export const PAGE_SIZES = [10, 50, 100] as const

interface FilterBarProps {
  keyword: string
  status: TicketStatus | null
  size: number
  onKeywordChange: (keyword: string) => void
  onStatusChange: (status: TicketStatus | null) => void
  onSizeChange: (size: number) => void
}

export function FilterBar({
  keyword,
  status,
  size,
  onKeywordChange,
  onStatusChange,
  onSizeChange,
}: FilterBarProps) {
  const [input, setInput] = useState(keyword)

  // Keep the local input in sync when the URL changes externally
  // (e.g. CommandPalette navigation).
  useEffect(() => {
    setInput(keyword)
  }, [keyword])

  // Debounce keyword propagation by 300ms.
  useEffect(() => {
    if (input === keyword) return
    const timer = setTimeout(() => onKeywordChange(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input, keyword, onKeywordChange])

  return (
    <div className={styles.bar}>
      <input
        type="search"
        className={styles.keyword}
        placeholder="Filter by keyword…"
        aria-label="Filter by keyword"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className={styles.chips} role="group" aria-label="Filter by status">
        <button
          type="button"
          className={`${styles.chip} ${status === null ? styles.activeChip : ''}`}
          onClick={() => onStatusChange(null)}
        >
          All
        </button>
        {TICKET_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.chip} ${status === s ? styles.activeChip : ''}`}
            onClick={() => onStatusChange(s)}
          >
            {STATUS_FILTER_LABEL[s]}
          </button>
        ))}
      </div>

      <select
        className={styles.size}
        aria-label="Page size"
        value={size}
        onChange={(e) => onSizeChange(Number(e.target.value))}
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </select>
    </div>
  )
}
