import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface BannerContextValue {
  message: string | null
  showBanner: (message: string) => void
  dismissBanner: () => void
}

const BannerContext = createContext<BannerContextValue | null>(null)

export function BannerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const showBanner = useCallback((msg: string) => setMessage(msg), [])
  const dismissBanner = useCallback(() => setMessage(null), [])

  return (
    <BannerContext.Provider value={{ message, showBanner, dismissBanner }}>
      {children}
    </BannerContext.Provider>
  )
}

export function useBanner(): BannerContextValue {
  const ctx = useContext(BannerContext)
  if (!ctx) throw new Error('useBanner must be used within BannerProvider')
  return ctx
}
