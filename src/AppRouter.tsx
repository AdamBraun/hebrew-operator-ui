import { HashRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import VersePage from './pages/VersePage'

function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:book/:chapter/:verse" element={<VersePage />} />
      </Routes>
    </HashRouter>
  )
}

export default AppRouter
