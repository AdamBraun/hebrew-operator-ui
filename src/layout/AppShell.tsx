import type { ReactNode } from 'react'
import ThemeSkinSettings from '../components/ThemeSkinSettings'

type AppShellProps = {
  children: ReactNode
  sidebar?: ReactNode
}

function AppShell({ children, sidebar }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <ThemeSkinSettings />
        <div className="app-shell__sidebar-content">{sidebar ?? <h2>Navigation</h2>}</div>
      </aside>
      <main className="app-shell__content">{children}</main>
    </div>
  )
}

export default AppShell
