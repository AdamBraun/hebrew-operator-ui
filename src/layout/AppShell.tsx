import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
}

function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <h2>Navigation</h2>
      </aside>
      <main className="app-shell__content">{children}</main>
    </div>
  )
}

export default AppShell
