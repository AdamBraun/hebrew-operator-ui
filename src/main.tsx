import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter'
import { NavProvider } from './state/nav'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavProvider>
      <AppRouter />
    </NavProvider>
  </StrictMode>,
)
