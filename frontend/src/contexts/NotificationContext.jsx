import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const NotificationContext = createContext()

const NOTIFICATION_TYPES = {
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
  },
  error: {
    icon: AlertCircle,
    className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
  },
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
  }
}

function NotificationItem({ notification, onRemove }) {
  const { icon: Icon, className } = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      className={`relative flex items-start p-4 border rounded-lg shadow-lg backdrop-blur-sm ${className}`}
    >
      <Icon className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {notification.title && (
          <h4 className="font-semibold text-sm mb-1">
            {notification.title}
          </h4>
        )}
        <p className="text-sm opacity-90">
          {notification.message}
        </p>
      </div>
      
      <button
        onClick={() => onRemove(notification.id)}
        className="ml-3 flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random()
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'success' })
  }, [addNotification])

  const error = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'error', duration: 8000 })
  }, [addNotification])

  const warning = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'warning' })
  }, [addNotification])

  const info = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'info' })
  }, [addNotification])

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
        <AnimatePresence>
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRemove={removeNotification}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

