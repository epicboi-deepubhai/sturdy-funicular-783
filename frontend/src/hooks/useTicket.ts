import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
import { getTicket } from '../api/tickets'
import type { TicketDetail } from '../types/ticket'
import type { Username } from './useCurrentUser'
import { useCurrentUser } from './useCurrentUser'
import { useErrorHandler } from './useErrorHandler'

interface UseTicketResult {
  ticket: TicketDetail | null
  loading: boolean
  error: string | null
  notFound: boolean
  accessLost: boolean
  refetch: () => Promise<void>
  setTicket: (ticket: TicketDetail) => void
}

export function useTicket(id: number): UseTicketResult {
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [accessLost, setAccessLost] = useState(false)
  const successfulUser = useRef<Username | null>(null)
  const requestSequence = useRef(0)
  const handleError = useErrorHandler()
  const { username } = useCurrentUser()

  const refetch = useCallback(async () => {
    const sequence = ++requestSequence.current
    setLoading(true)
    setError(null)
    setNotFound(false)
    setAccessLost(false)
    setTicket(null)
    try {
      const result = await getTicket(id)
      if (sequence !== requestSequence.current) return
      setTicket(result)
      successfulUser.current = username
    } catch (err) {
      if (sequence !== requestSequence.current) return
      if (err instanceof ApiError && err.status === 404) {
        if (successfulUser.current !== null && successfulUser.current !== username) {
          setAccessLost(true)
        } else {
          setNotFound(true)
        }
      } else {
        setError(handleError(err))
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }, [id, handleError, username])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { ticket, loading, error, notFound, accessLost, refetch, setTicket }
}
