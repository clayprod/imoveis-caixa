import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

// Layout Components
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import Footer from './components/layout/Footer'

// Page Components
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import PropertySearch from './pages/PropertySearch'
import PropertyDetails from './pages/PropertyDetails'
import AuctionStrategies from './pages/AuctionStrategies'
import MarketAnalysis from './pages/MarketAnalysis'
import UserProfile from './pages/UserProfile'
import Pricing from './pages/Pricing'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/AdminDashboard'

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'

// Utils
import { ProtectedRoute } from './components/auth/ProtectedRoute'

function AppContent() {
  const { user, isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // Simular carregamento inicial
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Carregando Imóveis Caixa Pro...</h2>
        </motion.div>
      </div>
    )
  }

  const isPublicRoute = ['/login', '/register', '/pricing'].includes(location.pathname)
  const showNavigation = isAuthenticated && !isPublicRoute

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          
          {/* Rotas protegidas */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AuthenticatedLayout 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen}
              >
                <Dashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/search" element={
            <ProtectedRoute>
              <AuthenticatedLayout 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen}
              >
                <PropertySearch />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/property/:id" element={
            <ProtectedRoute>
              <AuthenticatedLayout 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen}
              >
                <PropertyDetails />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/strategies" element={
            <ProtectedRoute>
              <AuthenticatedLayout 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen}
              >
                <AuctionStrategies />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/market" element={
            <ProtectedRoute>
              <AuthenticatedLayout 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen}
              >
                <MarketAnalysis />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <AuthenticatedLayout 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen}
              >
                <UserProfile />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          {/* Rotas de administrador */}
          <Route path="/admin/*" element={
            <ProtectedRoute requiredRole="admin">
              <AuthenticatedLayout 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen}
                isAdmin={true}
              >
                <AdminDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

function AuthenticatedLayout({ children, sidebarOpen, setSidebarOpen, isAdmin = false }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen} 
        setOpen={setSidebarOpen}
        isAdmin={isAdmin}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <AppContent />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

