import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
  sidebar?: ReactNode
}

function AppShell({ children, sidebar }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        {sidebar ?? <h2>Navigation</h2>}
      </aside>
      <main className="app-shell__content">{children}</main>
    </div>
  )
}

export default AppShell
