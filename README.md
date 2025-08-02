# Imóveis Caixa Pro - Plataforma SaaS Completa

## 🏠 Sobre o Projeto

**Imóveis Caixa Pro** é uma plataforma SaaS completa para análise inteligente de oportunidades de investimento em imóveis da Caixa Econômica Federal. A plataforma combina análise de dados, inteligência artificial e conteúdo educacional para maximizar o sucesso dos investidores em leilões imobiliários.

### ✨ Principais Funcionalidades

- **🤖 Análise com IA**: Sistema inteligente usando Amazon Bedrock para identificar as melhores oportunidades
- **📊 Dashboard Avançado**: Painéis personalizados por nível de plano (Básico, Pro, Premium)
- **🔍 Scraping Inteligente**: Coleta automática e análise de dados dos leilões da Caixa
- **📚 Conteúdo Educacional**: Guias completos, estratégias e calculadoras de viabilidade
- **🔔 Alertas Personalizados**: Notificações inteligentes baseadas em critérios customizados
- **💳 Sistema de Pagamentos**: Integração completa com gateways de pagamento
- **👥 Gestão de Usuários**: Sistema multi-nível com controle de acesso por funcionalidades
- **📱 Interface Responsiva**: Design moderno e otimizado para todos os dispositivos

### 🎯 Diferenciais Competitivos

1. **IA Adaptativa**: Sistema que aprende e se adapta às mudanças na estrutura dos dados da Caixa
2. **Análise de Localização**: Integração com Google Maps para análise de qualidade de localização
3. **Educação Integrada**: Conteúdo educacional completo sobre leilões e estratégias de investimento
4. **Automação Completa**: Desde coleta de dados até deploy automático via CI/CD
5. **Escalabilidade**: Arquitetura preparada para crescimento e alta demanda

## 🏗️ Arquitetura do Sistema

### Backend (Flask + Laravel)
- **API Flask**: Endpoints para análise de IA e processamento de dados
- **Laravel**: Sistema principal com autenticação, pagamentos e gestão de usuários
- **Banco de Dados**: MySQL/PostgreSQL para produção, SQLite para desenvolvimento
- **Cache**: Redis para otimização de performance
- **Queue**: Sistema de filas para processamento assíncrono

### Frontend (React)
- **React 18**: Interface moderna e responsiva
- **Tailwind CSS**: Estilização profissional e consistente
- **Context API**: Gerenciamento de estado global
- **React Router**: Navegação SPA otimizada

### Integrações
- **Amazon Bedrock**: IA para análise de oportunidades
- **Google Maps API**: Geocodificação e análise de localização
- **Gateways de Pagamento**: Stripe, Mercado Pago, PagSeguro
- **GitHub Actions**: CI/CD automatizado
- **AWS Services**: EC2, RDS, S3, CloudFront

## 📁 Estrutura do Projeto

```
imoveis-caixa-final/
├── backend/                 # Aplicação backend (Flask + Laravel)
│   ├── src/                # Código fonte Flask
│   ├── app/                # Código fonte Laravel
│   ├── database/           # Migrations e seeders
│   ├── config/             # Configurações
│   └── requirements.txt    # Dependências Python
├── frontend/               # Aplicação React
│   ├── src/                # Código fonte React
│   ├── public/             # Arquivos públicos
│   └── package.json        # Dependências Node.js
├── docs/                   # Documentação completa
│   ├── deployment/         # Guias de deploy
│   ├── api/                # Documentação da API
│   └── user-guide/         # Manual do usuário
├── scripts/                # Scripts de automação
│   ├── setup/              # Scripts de instalação
│   ├── deploy/             # Scripts de deploy
│   └── maintenance/        # Scripts de manutenção
├── config/                 # Configurações de ambiente
│   ├── nginx/              # Configuração Nginx
│   ├── ssl/                # Certificados SSL
│   └── aws/                # Configurações AWS
└── .github/                # Workflows GitHub Actions
    └── workflows/          # Pipelines CI/CD
```

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- Python 3.11+
- PHP 8.1+
- Composer
- MySQL/PostgreSQL
- Redis (opcional)

### Instalação Local

1. **Clone o repositório**
```bash
git clone <repository-url>
cd imoveis-caixa-final
```

2. **Configure o Backend**
```bash
cd backend
# Instalar dependências Python
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Instalar dependências PHP
composer install

# Configurar ambiente
cp .env.example .env
# Editar .env com suas configurações
```

3. **Configure o Frontend**
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Editar .env.local com suas configurações
```

4. **Executar em desenvolvimento**
```bash
# Terminal 1 - Backend Flask
cd backend && source venv/bin/activate && python src/main.py

# Terminal 2 - Backend Laravel
cd backend && php artisan serve --port=8000

# Terminal 3 - Frontend React
cd frontend && npm run dev
```

## 📋 Planos de Assinatura

### 🥉 Plano Básico (R$ 97/mês)
- Acesso a até 1.000 imóveis por mês
- Análise básica de oportunidades
- Alertas por email (máximo 5)
- Suporte por email

### 🥈 Plano Pro (R$ 197/mês)
- Acesso ilimitado a imóveis
- Análise completa com IA
- Alertas personalizados ilimitados
- Calculadora de viabilidade
- Conteúdo educacional completo
- Suporte prioritário

### 🥇 Plano Premium (R$ 397/mês)
- Todos os recursos do Pro
- Análise de portfólio com IA
- Estratégias personalizadas de leilão
- API para integrações
- Consultoria mensal (1h)
- Suporte 24/7

## 🔧 Deploy na AWS

Consulte o [Guia Completo de Deploy](docs/deployment/aws-complete-guide.md) para instruções detalhadas de como fazer o deploy completo na AWS.

### Resumo dos Passos:
1. Criar instância EC2
2. Configurar RDS (banco de dados)
3. Configurar S3 (armazenamento)
4. Configurar domínio e SSL
5. Deploy da aplicação
6. Configurar monitoramento

## 📚 Documentação

- [Guia de Deploy AWS](docs/deployment/aws-complete-guide.md)
- [Documentação da API](docs/api/README.md)
- [Manual do Usuário](docs/user-guide/README.md)
- [Guia de Desenvolvimento](docs/development/README.md)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- **Email**: suporte@imoveiscaixapro.com.br
- **WhatsApp**: +55 11 99999-9999
- **Discord**: [Comunidade Imóveis Caixa Pro](https://discord.gg/imoveiscaixapro)

## 🎯 Roadmap

### Q1 2025
- [ ] Integração com mais fontes de dados imobiliários
- [ ] App mobile (iOS/Android)
- [ ] Sistema de afiliados

### Q2 2025
- [ ] Análise preditiva avançada
- [ ] Integração com cartórios
- [ ] Marketplace de serviços

### Q3 2025
- [ ] IA para negociação automática
- [ ] Integração bancária
- [ ] Expansão internacional

---

**Desenvolvido com ❤️ para revolucionar o mercado de investimentos imobiliários no Brasil.**

