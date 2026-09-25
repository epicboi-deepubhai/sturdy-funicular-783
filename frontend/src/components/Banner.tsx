import { AnimatePresence, motion } from 'framer-motion'
import { useBanner } from '../hooks/useBanner'
import styles from './Banner.module.css'

/** Fixed bottom glass toast for connectivity (status 0) and 5xx errors (FR11). */
export function Banner() {
  const { message, dismissBanner } = useBanner()

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className={styles.banner}
          role="alert"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.message}>{message}</span>
          <button type="button" className={styles.dismiss} onClick={dismissBanner} aria-label="Dismiss">
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
