import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { registerUsernameGetter } from '../api/client'

export const USERS = ['alice', 'bob', 'carol'] as const
export type Username = (typeof USERS)[number]

const STORAGE_KEY = 'sf-user'
const DEFAULT_USER: Username = 'alice'

function loadStoredUser(): Username {
  const stored = localStorage.getItem(STORAGE_KEY)
  return (USERS as readonly string[]).includes(stored ?? '') ? (stored as Username) : DEFAULT_USER
}

interface CurrentUserContextValue {
  username: Username
  setUsername: (user: Username) => void
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [username, setUsernameState] = useState<Username>(() => {
    const initial = loadStoredUser()
    registerUsernameGetter(() => initial)
    return initial
  })

  const setUsername = (user: Username) => {
    localStorage.setItem(STORAGE_KEY, user)
    // Update the request identity before consumers rerender and refetch.
    registerUsernameGetter(() => user)
    setUsernameState(user)
  }

  return (
    <CurrentUserContext.Provider value={{ username, setUsername }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider')
  return ctx
}
