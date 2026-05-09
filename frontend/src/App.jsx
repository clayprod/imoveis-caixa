import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import PropertySearch from './pages/PropertySearch'
import PropertyDetails from './pages/PropertyDetails'
import AuctionCalendar from './pages/AuctionCalendar'
import Favorites from './pages/Favorites'
import Alerts from './pages/Alerts'

function App() {
  return (
    <Router>
      <Routes>
        {/* App único, sem auth — entry point é a busca */}
        <Route path="/" element={<Navigate to="/search" replace />} />
        <Route path="/search" element={<PropertySearch />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route path="/calendar" element={<AuctionCalendar />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/alerts" element={<Alerts />} />
        {/* Catch-all volta pra busca */}
        <Route path="*" element={<Navigate to="/search" replace />} />
      </Routes>
    </Router>
  )
}

export default App
