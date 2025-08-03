import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  Search, 
  Heart, 
  TrendingUp, 
  BookOpen, 
  Settings, 
  HelpCircle,
  X,
  Users,
  BarChart3,
  Shield,
  Zap,
  Target,
  Map
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '@/components/ui/button'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Visão geral e estatísticas'
  },
  {
    name: 'Buscar Imóveis',
    href: '/search',
    icon: Search,
    description: 'Encontre oportunidades'
  },
  {
    name: 'Análise de Mercado',
    href: '/market',
    icon: TrendingUp,
    description: 'Tendências e insights',
    requiresFeature: 'market_analysis'
  },
  {
    name: 'Estratégias de Leilão',
    href: '/strategies',
    icon: Target,
    description: 'Dicas e estratégias',
    requiresFeature: 'auction_strategies'
  },
  {
    name: 'Mapa de Imóveis',
    href: '/map',
    icon: Map,
    description: 'Visualização geográfica',
    requiresFeature: 'advanced_filters'
  }
]

const adminItems = [
  {
    name: 'Painel Admin',
    href: '/admin',
    icon: Shield,
    description: 'Administração geral'
  },
  {
    name: 'Usuários',
    href: '/admin/users',
    icon: Users,
    description: 'Gerenciar usuários'
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Métricas e relatórios'
  },
  {
    name: 'Sistema',
    href: '/admin/system',
    icon: Settings,
    description: 'Configurações do sistema'
  }
]

export default function Sidebar({ open, setOpen, isAdmin = false }) {
  const location = useLocation()
  const { user } = useAuth()

  const hasFeature = (feature) => {
    const planFeatures = {
      basic: ['property_search', 'basic_filters', 'favorites'],
      pro: [
        'property_search',
        'basic_filters',
        'favorites',
        'advanced_filters',
        'market_analysis',
        'alerts'
      ],
      premium: [
        'property_search',
        'basic_filters',
        'favorites',
        'advanced_filters',
        'market_analysis',
        'alerts',
        'ai_analysis',
        'auction_strategies',
        'priority_support'
      ]
    }
    const plan = user?.subscription?.plan?.name?.toLowerCase() || 'basic'
    return planFeatures[plan]?.includes(feature) || false
  }

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const canAccessItem = (item) => {
    if (!item.requiresFeature) return true
    return hasFeature(item.requiresFeature)
  }

  const items = isAdmin ? adminItems : navigationItems

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: open ? 0 : -320,
          transition: { type: "spring", damping: 30, stiffness: 300 }
        }}
        className="fixed left-0 top-0 z-50 h-full w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 lg:relative lg:translate-x-0 lg:z-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">IC</span>
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                {isAdmin ? 'Admin Panel' : 'Imóveis Caixa'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAdmin ? 'Painel de Controle' : 'Análise Inteligente'}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User info */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {user?.name || 'Usuário'}
              </p>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  <Zap className="w-3 h-3 mr-1" />
                  {user?.subscription?.plan?.name || 'Básico'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const accessible = canAccessItem(item)
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`
                  group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                  ${active 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : accessible
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }
                  ${!accessible && 'opacity-50'}
                `}
              >
                <Icon className={`
                  w-5 h-5 mr-3 transition-colors
                  ${active 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : accessible
                      ? 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                      : 'text-gray-400 dark:text-gray-600'
                  }
                `} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    {!accessible && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Link
            to="/help"
            className="flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-3" />
            Ajuda e Suporte
          </Link>
          
          <div className="px-4 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2024 Imóveis Caixa Pro
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Versão 1.0.0
            </p>
          </div>
        </div>
      </motion.div>
    </>
  )
}

