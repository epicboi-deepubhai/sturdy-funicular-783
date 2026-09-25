import styles from './Pager.module.css'

interface PagerProps {
  pageNumber: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pager({ pageNumber, totalPages, onPageChange }: PagerProps) {
  if (totalPages <= 1) return null

  return (
    <div className={styles.pager}>
      <button
        type="button"
        className={styles.button}
        disabled={pageNumber === 0}
        onClick={() => onPageChange(pageNumber - 1)}
      >
        ← Prev
      </button>
      <span className={styles.info}>
        Page {pageNumber + 1} of {totalPages}
      </span>
      <button
        type="button"
        className={styles.button}
        disabled={pageNumber >= totalPages - 1}
        onClick={() => onPageChange(pageNumber + 1)}
      >
        Next →
      </button>
    </div>
  )
}
