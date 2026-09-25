import styles from './Skeleton.module.css'

interface SkeletonProps {
  width?: string
  height?: string
  className?: string
}

export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

/** A placeholder row matching the ticket list row shape. */
export function SkeletonRow() {
  return (
    <div className={styles.row} data-testid="skeleton-row">
      <Skeleton width="40%" height="16px" />
      <div className={styles.rowMeta}>
        <Skeleton width="72px" height="22px" />
        <Skeleton width="64px" height="22px" />
        <Skeleton width="90px" height="14px" />
      </div>
    </div>
  )
}
