import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter'
import { NavProvider } from './state/nav'
import { ThemeSkinProvider } from './state/themeSkin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeSkinProvider>
      <NavProvider>
        <AppRouter />
      </NavProvider>
    </ThemeSkinProvider>
  </StrictMode>,
)
