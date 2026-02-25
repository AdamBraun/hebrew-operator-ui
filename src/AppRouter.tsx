import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import VersePage from './pages/VersePage'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:book/:chapter/:verse" element={<VersePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
