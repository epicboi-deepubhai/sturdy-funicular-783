import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { BannerProvider } from '../hooks/useBanner'
import { CurrentUserProvider } from '../hooks/useCurrentUser'

interface ProvidersProps {
  children: ReactNode
}

/** All app providers + router, for RTL tests of pages and shell components. */
export function Providers({ children, initialEntries = ['/'] }: ProvidersProps & { initialEntries?: string[] }) {
  return (
    <CurrentUserProvider>
      <BannerProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </BannerProvider>
    </CurrentUserProvider>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { initialEntries?: string[] },
) {
  const { initialEntries, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: ({ children }: ProvidersProps) => <Providers initialEntries={initialEntries}>{children}</Providers>,
    ...renderOptions,
  })
}
