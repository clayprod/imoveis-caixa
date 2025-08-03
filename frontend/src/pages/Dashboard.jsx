import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Search, 
  Heart, 
  Bell, 
  MapPin, 
  DollarSign, 
  Home,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Filter,
  Eye,
  Bookmark
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import API_BASE_URL from '../config/api'

// Mock data
const marketData = [
  { month: 'Jan', properties: 2400, avgPrice: 180000, opportunities: 45 },
  { month: 'Fev', properties: 2210, avgPrice: 175000, opportunities: 52 },
  { month: 'Mar', properties: 2290, avgPrice: 182000, opportunities: 48 },
  { month: 'Abr', properties: 2000, avgPrice: 178000, opportunities: 61 },
  { month: 'Mai', properties: 2181, avgPrice: 185000, opportunities: 55 },
  { month: 'Jun', properties: 2500, avgPrice: 190000, opportunities: 67 }
]

const recentProperties = [
  {
    id: 1,
    code: '1444419970935',
    title: 'Casa 3 Quartos - Jardim América',
    city: 'São Paulo',
    state: 'SP',
    price: 285000,
    originalPrice: 420000,
    discount: 32,
    financing: true,
    aiScore: 9.2,
    image: `${API_BASE_URL}/placeholder/300/200`
  },
  {
    id: 2,
    code: '1444419970936',
    title: 'Apartamento 2 Quartos - Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    price: 195000,
    originalPrice: 280000,
    discount: 30,
    financing: false,
    aiScore: 8.7,
    image: `${API_BASE_URL}/placeholder/300/200`
  },
  {
    id: 3,
    code: '1444419970937',
    title: 'Casa 4 Quartos - Bela Vista',
    city: 'Belo Horizonte',
    state: 'MG',
    price: 340000,
    originalPrice: 485000,
    discount: 30,
    financing: true,
    aiScore: 8.9,
    image: `${API_BASE_URL}/placeholder/300/200`
  }
]

const cityDistribution = [
  { name: 'São Paulo', value: 35, color: '#3B82F6' },
  { name: 'Rio de Janeiro', value: 25, color: '#8B5CF6' },
  { name: 'Belo Horizonte', value: 20, color: '#10B981' },
  { name: 'Brasília', value: 12, color: '#F59E0B' },
  { name: 'Outros', value: 8, color: '#6B7280' }
]

const alerts = [
  {
    id: 1,
    type: 'opportunity',
    title: 'Nova oportunidade encontrada!',
    description: 'Casa 3Q em Campinas com 45% de desconto',
    time: '2 horas atrás',
    urgent: true
  },
  {
    id: 2,
    type: 'price_drop',
    title: 'Redução de preço',
    description: 'Apartamento em Santos teve preço reduzido em R$ 25.000',
    time: '5 horas atrás',
    urgent: false
  },
  {
    id: 3,
    type: 'auction',
    title: 'Leilão próximo',
    description: 'Leilão de imóvel favoritado acontece em 3 dias',
    time: '1 dia atrás',
    urgent: true
  }
]

export default function Dashboard() {
  const { user, hasFeature, getSearchLimit } = useAuth()
  const [stats, setStats] = useState({
    totalSearches: 0,
    savedProperties: 0,
    activeAlerts: 0,
    monthlyOpportunities: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carregamento de dados
    const timer = setTimeout(() => {
      setStats({
        totalSearches: 127,
        savedProperties: 23,
        activeAlerts: 8,
        monthlyOpportunities: 156
      })
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const searchLimit = getSearchLimit()
  const searchUsage = (stats.totalSearches / (searchLimit === -1 ? 1000 : searchLimit)) * 100

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 bg-gray-200 rounded-lg"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Aqui está um resumo das suas atividades e oportunidades encontradas.
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Link to="/search">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Search className="w-4 h-4 mr-2" />
              Nova Busca
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Buscas Realizadas
              </p>
              <div className="flex items-baseline mt-2">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalSearches}
                </p>
                {searchLimit !== -1 && (
                  <p className="text-sm text-gray-500 ml-2">
                    / {searchLimit}
                  </p>
                )}
              </div>
              {searchLimit !== -1 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Uso mensal</span>
                    <span>{searchUsage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(searchUsage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Imóveis Salvos
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                {stats.savedProperties}
              </p>
              <div className="flex items-center mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+3 esta semana</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Alertas Ativos
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                {stats.activeAlerts}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-orange-600">2 urgentes</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Oportunidades (30d)
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
                {stats.monthlyOpportunities}
              </p>
              <div className="flex items-center mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12% vs mês anterior</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Market Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tendências do Mercado
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Evolução de imóveis e oportunidades nos últimos 6 meses
              </p>
            </div>
            {hasFeature('market_analysis') ? (
              <Link to="/market">
                <Button variant="outline" size="sm">
                  Ver Detalhes
                </Button>
              </Link>
            ) : (
              <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Plano Pro+
              </div>
            )}
          </div>
          
          {hasFeature('market_analysis') ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="opportunities" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  Análise de mercado disponível no Plano Pro
                </p>
                <Link to="/pricing">
                  <Button size="sm">Fazer Upgrade</Button>
                </Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* City Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Distribuição por Cidade
          </h3>
          
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={cityDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {cityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-2 mt-4">
            {cityDistribution.map((city, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: city.color }}
                  ></div>
                  <span className="text-gray-600 dark:text-gray-400">{city.name}</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {city.value}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Properties and Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Oportunidades Recentes
            </h3>
            <Link to="/search">
              <Button variant="outline" size="sm">
                Ver Todas
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentProperties.map((property) => (
              <div key={property.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Home className="w-8 h-8 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {property.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {property.financing && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Financiamento
                        </span>
                      )}
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        IA: {property.aiScore}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.city}, {property.state}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-green-600">
                        R$ {property.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        R$ {property.originalPrice.toLocaleString()}
                      </span>
                      <span className="text-sm text-green-600 font-medium">
                        -{property.discount}%
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Bookmark className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alertas Recentes
            </h3>
            <Button variant="outline" size="sm">
              Configurar
            </Button>
          </div>
          
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className={`
                p-4 rounded-lg border-l-4 
                ${alert.urgent 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                }
              `}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`
                      font-medium mb-1
                      ${alert.urgent 
                        ? 'text-red-900 dark:text-red-300' 
                        : 'text-blue-900 dark:text-blue-300'
                      }
                    `}>
                      {alert.title}
                    </h4>
                    <p className={`
                      text-sm mb-2
                      ${alert.urgent 
                        ? 'text-red-700 dark:text-red-400' 
                        : 'text-blue-700 dark:text-blue-400'
                      }
                    `}>
                      {alert.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {alert.time}
                    </p>
                  </div>
                  
                  {alert.urgent && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {!hasFeature('alerts') && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                Alertas personalizados disponíveis no Plano Pro
              </p>
              <Link to="/pricing">
                <Button size="sm" variant="outline">
                  Fazer Upgrade
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

