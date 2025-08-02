import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Search, 
  TrendingUp, 
  Shield, 
  Zap, 
  CheckCircle, 
  Star,
  ArrowRight,
  Play,
  Users,
  Target,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Search,
    title: 'Busca Inteligente',
    description: 'Encontre imóveis com filtros avançados e IA que identifica as melhores oportunidades automaticamente.'
  },
  {
    icon: TrendingUp,
    title: 'Análise de Mercado',
    description: 'Relatórios detalhados sobre tendências, preços e potencial de valorização em tempo real.'
  },
  {
    icon: Target,
    title: 'Estratégias de Leilão',
    description: 'Dicas e estratégias personalizadas para maximizar suas chances de arrematar imóveis.'
  },
  {
    icon: Shield,
    title: 'Dados Confiáveis',
    description: 'Informações atualizadas diretamente da Caixa Econômica Federal com verificação automática.'
  }
]

const plans = [
  {
    name: 'Básico',
    price: 'R$ 29',
    period: '/mês',
    description: 'Ideal para investidores iniciantes',
    features: [
      'Até 50 buscas por mês',
      'Filtros básicos',
      'Lista de favoritos',
      'Suporte por email'
    ],
    popular: false
  },
  {
    name: 'Pro',
    price: 'R$ 79',
    period: '/mês',
    description: 'Para investidores ativos',
    features: [
      'Até 500 buscas por mês',
      'Filtros avançados',
      'Análise de mercado',
      'Alertas personalizados',
      'Suporte prioritário'
    ],
    popular: true
  },
  {
    name: 'Premium',
    price: 'R$ 149',
    period: '/mês',
    description: 'Para profissionais do mercado',
    features: [
      'Buscas ilimitadas',
      'IA para análise de oportunidades',
      'Estratégias de leilão',
      'API de integração',
      'Suporte 24/7'
    ],
    popular: false
  }
]

const testimonials = [
  {
    name: 'Carlos Silva',
    role: 'Investidor Imobiliário',
    content: 'Com a plataforma consegui identificar 3 imóveis excelentes em apenas 2 meses. O ROI foi de 35%!',
    rating: 5
  },
  {
    name: 'Ana Santos',
    role: 'Corretora',
    content: 'As análises de mercado são precisas e me ajudam a orientar melhor meus clientes.',
    rating: 5
  },
  {
    name: 'João Oliveira',
    role: 'Empresário',
    content: 'Interface intuitiva e dados confiáveis. Recomendo para quem quer investir com segurança.',
    rating: 5
  }
]

const stats = [
  { number: '35,000+', label: 'Imóveis Analisados' },
  { number: '1,200+', label: 'Usuários Ativos' },
  { number: '89%', label: 'Taxa de Sucesso' },
  { number: 'R$ 2.5M', label: 'Em Negócios Fechados' }
]

export default function LandingPage() {
  const [videoPlaying, setVideoPlaying] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">IC</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Imóveis Caixa Pro</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Recursos</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Preços</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Depoimentos</a>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                Entrar
              </Link>
              <Link to="/register">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Encontre as
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  {' '}melhores oportunidades{' '}
                </span>
                em leilões da Caixa
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Plataforma inteligente com IA que analisa mais de 35.000 imóveis da Caixa Econômica Federal, 
                identificando as melhores oportunidades de investimento para você.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4">
                    Começar Grátis por 7 dias
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4"
                  onClick={() => setVideoPlaying(true)}
                >
                  <Play className="mr-2 w-5 h-5" />
                  Ver Demonstração
                </Button>
              </div>
              
              <div className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Sem cartão de crédito
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Cancele quando quiser
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl p-8">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Zap className="w-12 h-12 text-white" />
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Oportunidade Encontrada</p>
                      <p className="font-bold text-green-700">Casa 3Q - Desconto 45%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 line-through">R$ 180.000</p>
                      <p className="font-bold text-green-600">R$ 99.000</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">ROI Estimado</p>
                      <p className="font-bold text-blue-600">32%</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Score IA</p>
                      <p className="font-bold text-purple-600">9.2/10</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Background decorations */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full opacity-50"></div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Recursos Poderosos para Investidores Inteligentes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nossa plataforma combina tecnologia avançada com dados precisos para 
              maximizar suas oportunidades de investimento.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Planos para Todos os Perfis
            </h2>
            <p className="text-xl text-gray-600">
              Escolha o plano ideal para suas necessidades de investimento
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`
                  relative bg-white rounded-2xl shadow-lg p-8 
                  ${plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''}
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Mais Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 ml-1">{plan.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/register" className="block">
                  <Button 
                    className={`
                      w-full py-3 text-lg
                      ${plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-900 hover:bg-gray-800'
                      }
                    `}
                  >
                    Começar Agora
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              O que nossos usuários dizem
            </h2>
            <p className="text-xl text-gray-600">
              Histórias reais de sucesso de investidores como você
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-gray-600 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Pronto para encontrar sua próxima oportunidade?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Junte-se a mais de 1.200 investidores que já descobriram o poder da análise inteligente
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4">
                Começar Grátis Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">IC</span>
                </div>
                <span className="font-bold text-lg">Imóveis Caixa Pro</span>
              </div>
              <p className="text-gray-400">
                Plataforma inteligente para análise de imóveis da Caixa Econômica Federal.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Preços</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Imóveis Caixa Pro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

