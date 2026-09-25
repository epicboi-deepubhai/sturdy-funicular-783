import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './NavRail.module.css'

interface NavRailProps {
  onOpenSearch: () => void
}

function TicketsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5Z" />
      <path d="M13 5v2" />
      <path d="M13 11v2" />
      <path d="M13 17v2" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-med) var(--ease-out)' }}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function NavRail({ onOpenSearch }: NavRailProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <nav
      className={`${styles.rail} ${expanded ? styles.expanded : ''}`}
      aria-label="Primary"
    >
      <NavLink
        to="/"
        end
        className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        title="Tickets"
      >
        <TicketsIcon />
        <span className={styles.label}>Tickets</span>
      </NavLink>

      <NavLink
        to="/tickets/new"
        className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        title="New ticket"
      >
        <PlusIcon />
        <span className={styles.label}>New ticket</span>
      </NavLink>

      <button type="button" className={styles.item} onClick={onOpenSearch} title="Search (Ctrl+K)">
        <SearchIcon />
        <span className={styles.label}>Search</span>
      </button>

      <button
        type="button"
        className={`${styles.item} ${styles.collapse}`}
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        aria-expanded={expanded}
      >
        <ChevronIcon expanded={expanded} />
        <span className={styles.label}>Collapse</span>
      </button>
    </nav>
  )
}
