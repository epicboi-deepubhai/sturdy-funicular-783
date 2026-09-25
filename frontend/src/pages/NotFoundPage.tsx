import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  return (
    <EmptyState title="Page not found" body="The page you're looking for doesn't exist.">
      <Link to="/" className={styles.homeLink}>
        Back to tickets
      </Link>
    </EmptyState>
  )
}
