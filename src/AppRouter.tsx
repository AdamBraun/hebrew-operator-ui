import { HashRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import VersePage from './pages/VersePage'
import DevGraphPage from './pages/DevGraphPage'

function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dev/graph" element={<DevGraphPage />} />
        <Route path="/:book/:chapter/:verse" element={<VersePage />} />
      </Routes>
    </HashRouter>
  )
}

export default AppRouter
