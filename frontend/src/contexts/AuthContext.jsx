import { createContext, useContext, useState, useEffect } from 'react'
import API_BASE_URL from '../config/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken) {
      setToken(storedToken)
      validateToken(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const validateToken = async (jwt) => {
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${jwt}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        localStorage.removeItem('auth_token')
        setToken(null)
      }
    } catch (err) {
      console.error('Token validation failed:', err)
      localStorage.removeItem('auth_token')
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Realiza autenticação com as credenciais do usuário.
   *
   * @param {{ email: string, password: string }} params - Email e senha do usuário
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  const login = async ({ email, password }) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('auth_token', data.token)
        setToken(data.token)
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.message || 'Erro ao fazer login' }
    } catch (err) {
      console.error('Login failed:', err)
      return { success: false, error: 'Erro de conexão' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('auth_token', data.token)
        setToken(data.token)
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.message || 'Erro ao registrar' }
    } catch (err) {
      console.error('Register failed:', err)
      return { success: false, error: 'Erro de conexão' }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setToken(null)
  }

  const updateProfile = async (updates) => {
    if (!token) return { success: false, error: 'Não autenticado' }
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data)
        return { success: true }
      }
      return { success: false, error: data.message || 'Erro ao atualizar perfil' }
    } catch (err) {
      console.error('Update profile failed:', err)
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

