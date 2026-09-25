import { USERS, useCurrentUser } from '../hooks/useCurrentUser'
import type { Username } from '../hooks/useCurrentUser'
import styles from './UserSwitcher.module.css'

export function UserSwitcher() {
  const { username, setUsername } = useCurrentUser()

  return (
    <div className={styles.switcher} role="radiogroup" aria-label="Current user">
      {USERS.map((user: Username) => (
        <button
          key={user}
          type="button"
          role="radio"
          aria-checked={user === username}
          className={`${styles.pill} ${user === username ? styles.active : ''}`}
          onClick={() => setUsername(user)}
        >
          {user}
        </button>
      ))}
    </div>
  )
}
