import type { CommentResponse } from '../types/ticket'
import { formatAbsoluteTime, formatRelativeTime } from '../utils/time'
import styles from './CommentThread.module.css'

interface CommentThreadProps {
  comments: CommentResponse[]
}

/** Timeline, oldest first (backend ordering). */
export function CommentThread({ comments }: CommentThreadProps) {
  if (comments.length === 0) {
    return <p className={styles.empty}>No comments yet.</p>
  }

  return (
    <ol className={styles.thread} data-testid="comment-thread">
      {comments.map((comment) => (
        <li key={comment.id} className={styles.comment}>
          <span className={styles.avatar} aria-hidden="true">
            {comment.author.charAt(0).toUpperCase()}
          </span>
          <div className={styles.body}>
            <div className={styles.meta}>
              <span className={styles.author}>{comment.author}</span>
              <span className={styles.time} title={formatAbsoluteTime(comment.createdAt)}>
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <p className={styles.text}>{comment.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
