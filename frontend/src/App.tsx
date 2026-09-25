import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Banner } from './components/Banner'
import { CommandPalette } from './components/CommandPalette'
import { NavRail } from './components/NavRail'
import { PageTransition } from './components/PageTransition'
import { UserSwitcher } from './components/UserSwitcher'
import { BannerProvider } from './hooks/useBanner'
import { CurrentUserProvider } from './hooks/useCurrentUser'
import CreateTicketPage from './pages/CreateTicketPage'
import NotFoundPage from './pages/NotFoundPage'
import TicketDetailPage from './pages/TicketDetailPage'
import TicketListPage from './pages/TicketListPage'
import styles from './App.module.css'

export function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className={styles.layout}>
      <NavRail onOpenSearch={() => setPaletteOpen(true)} />
      <div className={styles.main}>
        <header className={styles.header}>
          <span className={styles.wordmark}>Sturdy Fernacular</span>
          <button
            type="button"
            className={styles.paletteTrigger}
            onClick={() => setPaletteOpen(true)}
          >
            Search… <kbd>Ctrl K</kbd>
          </button>
          <UserSwitcher />
        </header>
        <main className={styles.content}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><TicketListPage /></PageTransition>} />
              <Route path="/tickets/new" element={<PageTransition><CreateTicketPage /></PageTransition>} />
              <Route path="/tickets/:id" element={<PageTransition><TicketDetailPage /></PageTransition>} />
              <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Banner />
    </div>
  )
}

export default function App() {
  return (
    <CurrentUserProvider>
      <BannerProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </BannerProvider>
    </CurrentUserProvider>
  )
}
