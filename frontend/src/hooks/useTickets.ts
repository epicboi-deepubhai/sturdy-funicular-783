import { useEffect, useState } from 'react'
import { listTickets } from '../api/tickets'
import type { ListTicketsParams } from '../api/tickets'
import type { PageResponse, TicketListItem } from '../types/ticket'
import { useCurrentUser } from './useCurrentUser'
import { useErrorHandler } from './useErrorHandler'

interface UseTicketsResult {
  data: PageResponse<TicketListItem> | null
  loading: boolean
  error: string | null
  retry: () => void
}

export function useTickets(params: ListTicketsParams): UseTicketsResult {
  const [data, setData] = useState<PageResponse<TicketListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const handleError = useErrorHandler()
  const { username } = useCurrentUser()

  const { status, keyword, page, size } = params

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listTickets({ status, keyword, page, size })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(handleError(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, keyword, page, size, attempt, handleError, username])

  return { data, loading, error, retry: () => setAttempt((n) => n + 1) }
}
