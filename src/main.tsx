import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter'
import { fetchCorpusIndex } from './lib'

void fetchCorpusIndex().catch(() => {
  // Errors are surfaced by call sites that depend on the index.
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
