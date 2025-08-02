# 🤖 Guia para Agentes de IA - Imóveis Caixa Pro

## 📋 Visão Geral do Projeto

**Nome**: Imóveis Caixa Pro  
**Tipo**: Plataforma SaaS B2C  
**Objetivo**: Análise inteligente de oportunidades de investimento em imóveis da Caixa Econômica Federal  
**Modelo de Negócio**: Assinatura mensal (R$ 97, R$ 197, R$ 397)  
**Status**: Em produção na AWS EC2  

## 🎯 Propósito e Funcionalidades

### **Problema Resolvido**
- Dificuldade para analisar milhares de imóveis da Caixa
- Falta de ferramentas para calcular viabilidade de investimento
- Ausência de análise inteligente com IA
- Complexidade das regras de leilão da Caixa

### **Solução Oferecida**
- **Scraping Inteligente**: Coleta automática de dados dos imóveis
- **Análise com IA**: Recomendações baseadas em Amazon Bedrock
- **Simulador de Financiamento**: Cálculos precisos de viabilidade
- **Conteúdo Educacional**: Guias sobre leilões e estratégias
- **Alertas Personalizados**: Notificações de oportunidades

## 🏗️ Arquitetura e Stack Tecnológico

### **Frontend**
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Roteamento**: React Router DOM
- **Estado**: Context API + useState/useEffect
- **Build**: Vite (ES modules, HMR)
- **Deploy**: Nginx (arquivos estáticos)

### **Backend**
- **Framework**: Flask (Python 3.11)
- **IA**: Amazon Bedrock + OpenAI API
- **Banco**: SQLite (desenvolvimento) / PostgreSQL (produção)
- **Cache**: Redis (planejado)
- **APIs Externas**: Google Maps, APIs de mercado imobiliário
- **Deploy**: Systemd service + Nginx proxy

### **Infraestrutura**
- **Cloud**: AWS EC2 (Ubuntu 22.04)
- **Web Server**: Nginx
- **SSL**: Let's Encrypt (planejado)
- **Monitoramento**: Logs systemd + Nginx
- **Backup**: Scripts automatizados (planejado)

### **CI/CD**
- **Repositório**: GitHub
- **Automação**: GitHub Actions
- **Deploy**: Automático via SSH
- **Testes**: Pytest (backend) + Vitest (frontend)

## 📁 Estrutura de Diretórios

```
imoveis-caixa-final/
├── frontend/                    # React Application
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── layout/        # Navbar, Sidebar, Footer
│   │   │   ├── auth/          # Autenticação
│   │   │   └── PropertyFinancingSimulator.jsx  # Simulador principal
│   │   ├── pages/             # Páginas da aplicação
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PropertyDetails.jsx
│   │   │   └── admin/         # Painel administrativo
│   │   ├── contexts/          # Context API
│   │   ├── hooks/             # Custom hooks
│   │   └── lib/               # Utilitários
│   ├── public/                # Assets estáticos
│   └── dist/                  # Build de produção
│
├── backend/                     # Flask API
│   ├── src/
│   │   ├── main.py            # Arquivo principal
│   │   ├── routes/            # Endpoints da API
│   │   │   ├── analysis.py    # Análise de imóveis
│   │   │   ├── financing.py   # Simulador financiamento
│   │   │   └── user.py        # Gestão de usuários
│   │   ├── services/          # Lógica de negócio
│   │   │   ├── bedrock_service.py        # Amazon Bedrock
│   │   │   ├── financing_calculator.py  # Cálculos financeiros
│   │   │   ├── scraping_service.py      # Web scraping
│   │   │   └── market_analysis.py       # Análise de mercado
│   │   ├── models/            # Modelos de dados
│   │   └── database/          # Configuração DB
│   ├── venv/                  # Ambiente virtual Python
│   └── requirements.txt       # Dependências Python
│
├── docs/                        # Documentação
│   ├── SIMULADOR_FINANCIAMENTO.md
│   ├── guia_completo_leiloes_caixa.md
│   ├── estrategias_por_perfil.md
│   └── deployment/
│       └── aws-complete-guide.md
│
├── scripts/                     # Scripts de automação
│   ├── setup/
│   │   └── install.sh         # Instalação automatizada
│   └── deploy/
│       └── deploy.sh          # Deploy automatizado
│
├── config/                      # Configurações
│   └── nginx/
│       └── imoveis-caixa.conf # Configuração Nginx
│
├── .github/                     # GitHub Actions
│   └── workflows/
│       ├── deploy.yml         # Deploy automático
│       └── codex-analysis.yml # Análise com Codex
│
└── agents.md                    # Este arquivo
```

## 🔑 Componentes Principais

### **1. PropertyFinancingSimulator.jsx**
- **Localização**: `frontend/src/components/PropertyFinancingSimulator.jsx`
- **Função**: Simulador completo de financiamento imobiliário
- **Baseado em**: Planilha Excel de viabilidade fornecida
- **Cálculos**: Sistema Price, SAC, ROI, VPL, análise de riscos
- **Interface**: 3 tabs (Dados, Resultados, Comparações)

### **2. financing_calculator.py**
- **Localização**: `backend/src/services/financing_calculator.py`
- **Função**: Engine de cálculos financeiros
- **Algoritmos**: Financiamento, amortização, rentabilidade
- **Análises**: Cenários otimista/pessimista, análise de sensibilidade

### **3. bedrock_service.py**
- **Localização**: `backend/src/services/bedrock_service.py`
- **Função**: Integração com Amazon Bedrock para análise de IA
- **Modelos**: Claude, Llama para análise de oportunidades
- **Cache**: Sistema inteligente para otimizar custos

### **4. scraping_service.py**
- **Localização**: `backend/src/services/scraping_service.py`
- **Função**: Coleta inteligente de dados da Caixa
- **Adaptativo**: Detecta mudanças na estrutura automaticamente
- **IA**: Usa Bedrock para interpretar mudanças

## 🔧 APIs e Endpoints

### **Análise de Imóveis**
- `POST /api/analysis/property` - Análise individual
- `POST /api/analysis/batch` - Análise em lote
- `GET /api/analysis/opportunities` - Melhores oportunidades

### **Simulador de Financiamento**
- `POST /api/financing/calculate` - Cálculo completo
- `POST /api/financing/sensitivity-analysis` - Análise de cenários
- `POST /api/financing/quick-estimate` - Estimativa rápida
- `GET /api/financing/market-rates` - Taxas de mercado
- `POST /api/financing/amortization-table` - Tabela de amortização

### **Gestão de Usuários**
- `POST /api/register` - Registro
- `POST /api/login` - Login
- `GET /api/profile` - Perfil do usuário
- `PUT /api/subscription` - Gestão de assinatura

## 🎨 Design System

### **Cores Principais**
- **Primary**: Blue (#4F46E5)
- **Success**: Green (#059669)
- **Warning**: Yellow (#D97706)
- **Error**: Red (#DC2626)
- **Gray Scale**: Tailwind gray palette

### **Componentes UI**
- **Base**: shadcn/ui components
- **Customização**: Tailwind CSS classes
- **Responsividade**: Mobile-first approach
- **Acessibilidade**: ARIA labels, keyboard navigation

## 💳 Sistema de Pagamentos

### **Planos de Assinatura**
1. **Básico** (R$ 97/mês): Funcionalidades essenciais
2. **Pro** (R$ 197/mês): Análise avançada + simulador
3. **Premium** (R$ 397/mês): Todos os recursos + API

### **Gateways Suportados**
- Stripe (internacional)
- Mercado Pago (Brasil)
- PagSeguro (Brasil)
- PIX (planejado)

## 🤖 Integração com IA

### **Amazon Bedrock**
- **Modelos**: Claude-3, Llama-2
- **Uso**: Análise de oportunidades, detecção de mudanças
- **Otimização**: Cache inteligente, rate limiting

### **OpenAI API**
- **Modelo**: GPT-4
- **Uso**: Análise de texto, geração de relatórios
- **Backup**: Para quando Bedrock não disponível

### **Prompts Principais**
```python
# Análise de oportunidade
OPPORTUNITY_ANALYSIS_PROMPT = """
Analise este imóvel considerando:
- Localização e infraestrutura
- Preço vs. valor de mercado
- Potencial de valorização
- Riscos de investimento
- Estratégia recomendada
"""

# Detecção de mudanças
STRUCTURE_CHANGE_PROMPT = """
Compare estas duas estruturas de dados e identifique:
- Campos adicionados/removidos
- Mudanças de formato
- Novos padrões de dados
- Sugestões de adaptação
"""
```

## 📊 Dados e Fontes

### **Fonte Principal**
- **Site**: https://venda-imoveis.caixa.gov.br
- **Formato**: CSV + páginas individuais
- **Frequência**: Atualização diária
- **Volume**: ~35.000 imóveis

### **Dados Coletados**
- Código do imóvel
- Endereço completo
- Valor de venda/avaliação
- Características (área, quartos, etc.)
- Modalidade de venda
- Aceita financiamento
- Situação de ocupação

### **APIs Externas**
- **Google Maps**: Geocodificação, POIs
- **IBGE**: Dados demográficos
- **Banco Central**: Taxas de juros
- **FipeZap**: Índices imobiliários

## 🔒 Segurança e Compliance

### **Autenticação**
- JWT tokens
- Refresh tokens
- Rate limiting
- CORS configurado

### **Dados Sensíveis**
- Senhas hasheadas (bcrypt)
- Dados de pagamento tokenizados
- Logs anonimizados
- LGPD compliance

### **Variáveis de Ambiente**
```env
# APIs
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
GOOGLE_MAPS_API_KEY=AIza...

# Banco de Dados
DATABASE_URL=postgresql://...

# Pagamentos
STRIPE_SECRET_KEY=sk_...
MERCADOPAGO_ACCESS_TOKEN=...

# Configurações
FLASK_ENV=production
SECRET_KEY=...
```

## 🚀 Deploy e DevOps

### **Ambiente de Produção**
- **Servidor**: AWS EC2 t3.medium
- **OS**: Ubuntu 22.04 LTS
- **IP**: 3.145.29.139 (exemplo)
- **Domínio**: A configurar

### **Comandos Úteis**
```bash
# Restart da aplicação
sudo systemctl restart imoveis-caixa

# Logs em tempo real
sudo journalctl -u imoveis-caixa -f

# Deploy manual
cd /home/ubuntu/imoveis-caixa-final
git pull origin main
./scripts/deploy/deploy.sh

# Build do frontend
cd frontend
npm run build
sudo cp -r dist/* /var/www/imoveis/
```

### **Monitoramento**
- **Logs**: systemd + Nginx
- **Métricas**: htop, iostat
- **Alertas**: Email para erros críticos
- **Backup**: Diário via cron

## 🎯 Objetivos de Melhoria

### **Performance**
- Implementar Redis para cache
- Otimizar queries do banco
- CDN para assets estáticos
- Lazy loading de componentes

### **Funcionalidades**
- Sistema de favoritos
- Comparador de imóveis
- Relatórios em PDF
- App mobile (React Native)

### **IA e Automação**
- Predição de preços com ML
- Alertas inteligentes
- Chatbot para suporte
- Análise de sentimento de reviews

## 🤝 Como Contribuir (Para Agentes de IA)

### **Análise de Código**
1. **Leia** a estrutura completa do projeto
2. **Identifique** padrões e convenções
3. **Sugira** melhorias de performance
4. **Detecte** possíveis bugs ou vulnerabilidades
5. **Proponha** refatorações quando necessário

### **Desenvolvimento de Features**
1. **Entenda** o contexto de negócio
2. **Siga** os padrões estabelecidos
3. **Teste** thoroughly antes de sugerir
4. **Documente** mudanças propostas
5. **Considere** impacto na UX/UI

### **Otimizações**
1. **Performance**: Bundle size, lazy loading
2. **SEO**: Meta tags, structured data
3. **Acessibilidade**: ARIA, keyboard navigation
4. **Mobile**: Responsividade, touch gestures
5. **Segurança**: Validações, sanitização

### **Padrões de Código**

#### **Frontend (React)**
```jsx
// Componente funcional com hooks
const ComponentName = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

#### **Backend (Flask)**
```python
# Route com validação e tratamento de erro
@blueprint.route('/endpoint', methods=['POST'])
def endpoint_function():
    try:
        data = request.get_json()
        
        # Validação
        if not data or 'required_field' not in data:
            return jsonify({'error': 'Campo obrigatório'}), 400
        
        # Processamento
        result = service_function(data)
        
        return jsonify({'success': True, 'data': result}), 200
        
    except Exception as e:
        logger.error(f"Erro em endpoint: {str(e)}")
        return jsonify({'error': 'Erro interno'}), 500
```

## 📚 Recursos de Referência

### **Documentação Técnica**
- [React Docs](https://react.dev/)
- [Flask Docs](https://flask.palletsprojects.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

### **APIs Utilizadas**
- [Amazon Bedrock](https://docs.aws.amazon.com/bedrock/)
- [OpenAI API](https://platform.openai.com/docs)
- [Google Maps API](https://developers.google.com/maps)

### **Documentação do Projeto**
- `docs/SIMULADOR_FINANCIAMENTO.md` - Simulador detalhado
- `docs/guia_completo_leiloes_caixa.md` - Regras de leilão
- `docs/deployment/aws-complete-guide.md` - Deploy na AWS

## 🎯 Metas de Negócio

### **Curto Prazo (3 meses)**
- 1.000 usuários registrados
- 100 assinantes pagantes
- R$ 20.000 MRR (Monthly Recurring Revenue)

### **Médio Prazo (6 meses)**
- 5.000 usuários registrados
- 500 assinantes pagantes
- R$ 100.000 MRR
- App mobile lançado

### **Longo Prazo (12 meses)**
- 20.000 usuários registrados
- 2.000 assinantes pagantes
- R$ 400.000 MRR
- Expansão para outros bancos

---

## 🤖 Instruções Específicas para Agentes de IA

### **Ao Analisar o Código**
1. **Priorize** funcionalidades que impactem diretamente a receita
2. **Considere** sempre a experiência do usuário final
3. **Mantenha** compatibilidade com a arquitetura existente
4. **Sugira** melhorias incrementais, não reescritas completas
5. **Documente** todas as mudanças propostas

### **Ao Propor Melhorias**
1. **Explique** o problema que está resolvendo
2. **Quantifique** o impacto esperado (performance, UX, etc.)
3. **Considere** o esforço de implementação
4. **Teste** mentalmente a solução em diferentes cenários
5. **Pense** na manutenibilidade a longo prazo

### **Linguagem e Tom**
- **Seja** técnico mas acessível
- **Use** exemplos práticos
- **Explique** o "porquê" das decisões
- **Considere** o contexto de negócio
- **Mantenha** foco na solução de problemas reais

---

**Este projeto representa uma oportunidade real de negócio no mercado imobiliário brasileiro. Toda contribuição deve visar o sucesso comercial da plataforma, mantendo sempre a qualidade técnica e a experiência do usuário como prioridades.**

