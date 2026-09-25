import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { getTicket } from '../api/tickets'
import type { TicketDetail } from '../types/ticket'
import { useErrorHandler } from './useErrorHandler'

interface UseTicketResult {
  ticket: TicketDetail | null
  loading: boolean
  error: string | null
  notFound: boolean
  refetch: () => Promise<void>
  setTicket: (ticket: TicketDetail) => void
}

export function useTicket(id: number): UseTicketResult {
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const handleError = useErrorHandler()

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      setTicket(await getTicket(id))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true)
      else setError(handleError(err))
    } finally {
      setLoading(false)
    }
  }, [id, handleError])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { ticket, loading, error, notFound, refetch, setTicket }
}
