import { createContext, useContext, useReducer, useEffect } from 'react'
import API_BASE_URL from '../config/api'

const AuthContext = createContext()

// Actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING'
}

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  subscription: null
}

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null
      }
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        subscription: action.payload.subscription,
        isAuthenticated: true,
        loading: false,
        error: null
      }
    
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      }
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        subscription: null,
        isAuthenticated: false,
        loading: false,
        error: null
      }
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      }
    
    default:
      return state
  }
}

// Provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
        return
      }

      // Validate token with backend
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: data.user,
            subscription: data.subscription
          }
        })
      } else {
        localStorage.removeItem('auth_token')
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('auth_token')
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
    }
  }

  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START })
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('auth_token', data.token)
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: data.user,
            subscription: data.subscription
          }
        })
        return { success: true }
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: data.message || 'Erro ao fazer login'
        })
        return { success: false, error: data.message }
      }
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: 'Erro de conexão. Tente novamente.'
      })
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START })
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('auth_token', data.token)
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: data.user,
            subscription: data.subscription
          }
        })
        return { success: true }
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: data.message || 'Erro ao criar conta'
        })
        return { success: false, error: data.message }
      }
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: 'Erro de conexão. Tente novamente.'
      })
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    dispatch({ type: AUTH_ACTIONS.LOGOUT })
  }

  const updateUser = (updates) => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updates })
  }

  // Helper functions
  const hasFeature = (feature) => {
    if (!state.subscription) return false
    
    const planFeatures = {
      basic: ['property_search', 'basic_filters', 'favorites'],
      pro: ['property_search', 'basic_filters', 'favorites', 'advanced_filters', 'market_analysis', 'alerts'],
      premium: ['property_search', 'basic_filters', 'favorites', 'advanced_filters', 'market_analysis', 'alerts', 'ai_analysis', 'auction_strategies', 'priority_support']
    }
    
    const userPlan = state.subscription.plan?.name?.toLowerCase() || 'basic'
    return planFeatures[userPlan]?.includes(feature) || false
  }

  const isAdmin = () => {
    return state.user?.role === 'admin' || state.user?.role === 'super_admin'
  }

  const isSuperAdmin = () => {
    return state.user?.role === 'super_admin'
  }

  const getSearchLimit = () => {
    if (!state.subscription) return 10
    
    const limits = {
      basic: 50,
      pro: 500,
      premium: -1 // unlimited
    }
    
    const userPlan = state.subscription.plan?.name?.toLowerCase() || 'basic'
    return limits[userPlan] || 10
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    hasFeature,
    isAdmin,
    isSuperAdmin,
    getSearchLimit,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

