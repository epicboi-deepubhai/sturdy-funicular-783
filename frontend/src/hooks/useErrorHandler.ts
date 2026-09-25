import { useCallback } from 'react'
import { ApiError } from '../api/client'
import { useBanner } from './useBanner'

/**
 * FR11 split: connectivity (status 0) and server (>=500) errors also raise the
 * global banner ("Can't reach the server"); the backend `message` is always
 * returned so the caller can render it verbatim next to the UI that failed.
 */
export function useErrorHandler(): (err: unknown) => string {
  const { showBanner } = useBanner()

  return useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError) {
        if (err.status === 0 || err.status >= 500) showBanner(err.message)
        return err.message
      }
      return 'Something went wrong'
    },
    [showBanner],
  )
}
