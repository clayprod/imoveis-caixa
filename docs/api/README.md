# API Documentation - Imóveis Caixa Pro

## 🔗 Base URL

- **Production**: `https://seu-dominio.com/api`
- **Staging**: `https://staging.seu-dominio.com/api`
- **Development**: `http://localhost:5000/api`

## 🔐 Authentication

A API utiliza autenticação baseada em tokens JWT. Para acessar endpoints protegidos, inclua o token no header:

```
Authorization: Bearer <your-jwt-token>
```

### Obter Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "plan": "pro"
  }
}
```

## 📊 Analysis Endpoints

### Property Analysis

Analisa uma oportunidade de investimento imobiliário usando IA.

```http
POST /analysis/property-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "codigo": "1444419970935",
  "tipo_imovel": "Apartamento",
  "endereco_completo": "Rua das Flores, 123, Centro, São Paulo, SP",
  "cidade": "São Paulo",
  "uf": "SP",
  "area_total": 65.5,
  "valor_avaliacao": 250000,
  "valor_venda": 180000,
  "aceita_financiamento": true,
  "situacao_ocupacao": "desocupado"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "score": 85,
    "recomendacao": "compra",
    "pontos_positivos": [
      "Excelente desconto de 28%",
      "Aceita financiamento",
      "Imóvel desocupado",
      "Boa localização no centro"
    ],
    "riscos": [
      "Necessidade de reforma",
      "Mercado saturado na região"
    ],
    "estrategia_recomendada": "Locação após reforma básica",
    "roi_estimado": "8% a 12%",
    "perfil_investidor": "moderado",
    "dicas_especificas": [
      "Visite o imóvel antes do leilão",
      "Orce reformas necessárias",
      "Analise comparáveis na região"
    ]
  },
  "property_data": {
    "desconto_percentual": 28.0
  }
}
```

### Quick Score

Calcula score rápido sem usar IA (mais econômico).

```http
POST /analysis/quick-score
Content-Type: application/json

{
  "valor_avaliacao": 250000,
  "valor_venda": 180000,
  "aceita_financiamento": true,
  "situacao_ocupacao": "desocupado",
  "area_total": 65.5,
  "cidade": "São Paulo"
}
```

**Response:**
```json
{
  "success": true,
  "quick_analysis": {
    "score": 78,
    "classification": "Boa oportunidade",
    "recommendation": "compra",
    "factors": [
      "Ótimo desconto: 28.0%",
      "Aceita financiamento",
      "Imóvel desocupado",
      "Boa área: 65.5m²",
      "Localização em capital"
    ],
    "desconto_percentual": 28.0
  }
}
```

### Market Insights

Gera insights de mercado baseados em dados agregados.

```http
POST /analysis/market-insights
Authorization: Bearer <token>
Content-Type: application/json

{
  "total_properties": 1500,
  "average_price": 220000,
  "average_discount": 22.5,
  "top_cities": ["São Paulo", "Rio de Janeiro", "Belo Horizonte"],
  "common_types": ["Apartamento", "Casa", "Terreno"],
  "period": "2024-Q1"
}
```

**Response:**
```json
{
  "success": true,
  "insights": {
    "tendencias_gerais": [
      "Aumento de 15% nos descontos médios",
      "Maior demanda por imóveis prontos",
      "Crescimento do interesse em capitais"
    ],
    "oportunidades_destaque": [
      "Apartamentos em São Paulo com desconto > 30%",
      "Casas em Belo Horizonte para reforma",
      "Terrenos no Rio de Janeiro para desenvolvimento"
    ],
    "alertas_mercado": [
      "Alta concorrência em leilões de SP",
      "Aumento nos custos de reforma",
      "Mudanças na legislação de financiamento"
    ],
    "recomendacoes_estrategicas": [
      "Diversificar geograficamente",
      "Focar em imóveis com financiamento",
      "Considerar parcerias para grandes projetos"
    ],
    "previsoes": {
      "proximo_trimestre": "Estabilização dos preços com leve alta",
      "proximo_ano": "Crescimento moderado do mercado"
    }
  }
}
```

### Portfolio Analysis

Analisa um portfólio de investimentos imobiliários.

```http
POST /analysis/portfolio-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "properties": [
    {
      "codigo": "123456",
      "tipo_imovel": "Apartamento",
      "cidade": "São Paulo",
      "uf": "SP",
      "valor_venda": 180000,
      "area_total": 65
    },
    {
      "codigo": "789012",
      "tipo_imovel": "Casa",
      "cidade": "Rio de Janeiro",
      "uf": "RJ",
      "valor_venda": 320000,
      "area_total": 120
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "score_diversificacao": 75,
    "pontos_fortes": [
      "Boa diversificação geográfica",
      "Mix equilibrado de tipos de imóveis",
      "Valores adequados ao mercado"
    ],
    "areas_melhoria": [
      "Concentração em região Sudeste",
      "Falta de imóveis comerciais",
      "Necessidade de imóveis de maior valor"
    ],
    "recomendacoes_otimizacao": [
      "Adicionar imóveis no Nordeste",
      "Considerar salas comerciais",
      "Incluir terrenos para desenvolvimento"
    ],
    "risco_concentracao": "medio",
    "estrategia_expansao": "Expandir gradualmente para outras regiões"
  },
  "portfolio_stats": {
    "total_properties": 2,
    "total_value": 500000,
    "average_value": 250000,
    "cities_count": 2,
    "types_count": 2,
    "cities": ["São Paulo", "Rio de Janeiro"],
    "types": ["Apartamento", "Casa"]
  }
}
```

### Auction Strategy

Gera estratégia personalizada para leilão.

```http
POST /analysis/auction-strategy
Authorization: Bearer <token>
Content-Type: application/json

{
  "property_data": {
    "codigo": "123456",
    "valor_venda": 180000,
    "desconto_percentual": 28.0,
    "cidade": "São Paulo"
  },
  "user_profile": {
    "experience_level": "intermediario",
    "available_capital": 300000,
    "investment_goal": "locacao",
    "risk_tolerance": "moderado"
  }
}
```

**Response:**
```json
{
  "success": true,
  "strategy": {
    "lance_maximo_recomendado": 195000,
    "estrategia_lance": "Entrar no meio do leilão com lances incrementais de R$ 2.000",
    "pontos_atencao": [
      "Verificar documentação antes do leilão",
      "Confirmar situação de ocupação",
      "Orçar reformas necessárias"
    ],
    "preparacao_necessaria": [
      "Visitar o imóvel pessoalmente",
      "Obter 3 orçamentos de reforma",
      "Confirmar aprovação de financiamento",
      "Separar documentação completa"
    ],
    "plano_pos_arrematacao": "Iniciar reforma imediatamente e buscar inquilino em 60 dias"
  }
}
```

## 🏠 Property Endpoints

### List Properties

Lista imóveis com filtros e paginação.

```http
GET /properties?page=1&limit=20&city=São Paulo&min_price=100000&max_price=500000
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo": "1444419970935",
      "tipo_imovel": "Apartamento",
      "endereco": "Rua das Flores, 123",
      "cidade": "São Paulo",
      "uf": "SP",
      "area_total": 65.5,
      "valor_avaliacao": 250000,
      "valor_venda": 180000,
      "desconto_percentual": 28.0,
      "aceita_financiamento": true,
      "situacao_ocupacao": "desocupado",
      "ai_score": 85,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 1500,
    "total_pages": 75
  }
}
```

### Get Property Details

Obtém detalhes completos de um imóvel.

```http
GET /properties/1444419970935
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "codigo": "1444419970935",
    "tipo_imovel": "Apartamento",
    "endereco_completo": "Rua das Flores, 123, Centro, São Paulo, SP, 01234-567",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "area_total": 65.5,
    "quartos": 2,
    "banheiros": 1,
    "vagas": 1,
    "valor_avaliacao": 250000,
    "valor_venda": 180000,
    "desconto_percentual": 28.0,
    "aceita_financiamento": true,
    "situacao_ocupacao": "desocupado",
    "ai_score": 85,
    "ai_analysis": {
      "score": 85,
      "recomendacao": "compra",
      "pontos_positivos": ["..."],
      "riscos": ["..."]
    },
    "location_analysis": {
      "score": 78,
      "classification": "Boa",
      "nearby_amenities": ["..."]
    },
    "images": [
      "https://s3.amazonaws.com/bucket/property/123/image1.jpg"
    ],
    "documents": [
      "https://s3.amazonaws.com/bucket/property/123/matricula.pdf"
    ]
  }
}
```

## 👤 User Endpoints

### Get User Profile

```http
GET /user/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "plan": "pro",
    "subscription_status": "active",
    "subscription_expires_at": "2024-12-31T23:59:59Z",
    "features": [
      "ai_analysis",
      "unlimited_properties",
      "alerts",
      "portfolio_analysis"
    ],
    "usage": {
      "ai_analyses_this_month": 45,
      "ai_analyses_limit": 100,
      "properties_viewed_this_month": 1250
    }
  }
}
```

### Update User Profile

```http
PUT /user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "João da Silva",
  "phone": "+55 11 99999-9999",
  "investment_profile": {
    "experience_level": "intermediario",
    "risk_tolerance": "moderado",
    "preferred_cities": ["São Paulo", "Rio de Janeiro"],
    "budget_range": {
      "min": 100000,
      "max": 500000
    }
  }
}
```

## 🔔 Alert Endpoints

### Create Alert

```http
POST /alerts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Apartamentos SP com desconto > 25%",
  "description": "Apartamentos em São Paulo com desconto superior a 25%",
  "criteria": {
    "city": "São Paulo",
    "property_type": "Apartamento",
    "min_discount": 25,
    "accepts_financing": true,
    "occupation_status": "desocupado",
    "min_ai_score": 70
  },
  "frequency": "immediate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "Apartamentos SP com desconto > 25%",
    "is_active": true,
    "frequency": "immediate",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### List User Alerts

```http
GET /alerts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "name": "Apartamentos SP com desconto > 25%",
      "description": "Apartamentos em São Paulo com desconto superior a 25%",
      "is_active": true,
      "frequency": "immediate",
      "trigger_count": 12,
      "last_triggered_at": "2024-01-14T15:20:00Z",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## 📊 Statistics Endpoints

### Dashboard Stats

```http
GET /stats/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_properties": 35708,
    "new_properties_today": 45,
    "average_discount": 22.5,
    "best_opportunities": 156,
    "user_stats": {
      "favorite_properties": 12,
      "active_alerts": 5,
      "analyses_this_month": 45
    },
    "market_trends": {
      "price_trend": "stable",
      "discount_trend": "increasing",
      "volume_trend": "increasing"
    }
  }
}
```

## ❌ Error Responses

Todos os endpoints podem retornar os seguintes erros:

### 400 Bad Request
```json
{
  "error": "Dados inválidos",
  "message": "O campo 'valor_venda' é obrigatório",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized
```json
{
  "error": "Token inválido ou expirado",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden
```json
{
  "error": "Recurso não disponível no seu plano",
  "message": "Upgrade para o plano Pro para acessar análise com IA",
  "code": "FEATURE_NOT_AVAILABLE"
}
```

### 404 Not Found
```json
{
  "error": "Recurso não encontrado",
  "code": "NOT_FOUND"
}
```

### 429 Too Many Requests
```json
{
  "error": "Limite de requisições excedido",
  "message": "Tente novamente em 60 segundos",
  "retry_after": 60,
  "code": "RATE_LIMIT_EXCEEDED"
}
```

### 500 Internal Server Error
```json
{
  "error": "Erro interno do servidor",
  "message": "Tente novamente mais tarde",
  "code": "INTERNAL_ERROR"
}
```

## 📝 Rate Limiting

- **Análise com IA**: 100 requisições/hora por usuário
- **Endpoints gerais**: 1000 requisições/hora por usuário
- **Login**: 5 tentativas/minuto por IP

## 🔧 SDKs e Integrações

### JavaScript/Node.js

```javascript
const ImoveisCaixaAPI = require('@imoveis-caixa-pro/sdk');

const client = new ImoveisCaixaAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://seu-dominio.com/api'
});

// Analisar propriedade
const analysis = await client.properties.analyze({
  codigo: '1444419970935',
  valor_venda: 180000,
  valor_avaliacao: 250000
});
```

### Python

```python
from imoveis_caixa_pro import ImoveisCaixaClient

client = ImoveisCaixaClient(
    api_key='your-api-key',
    base_url='https://seu-dominio.com/api'
)

# Analisar propriedade
analysis = client.properties.analyze({
    'codigo': '1444419970935',
    'valor_venda': 180000,
    'valor_avaliacao': 250000
})
```

## 🧪 Testing

### Postman Collection

Importe nossa collection do Postman: [Download Collection](./postman/imoveis-caixa-pro.json)

### Sandbox Environment

Use nosso ambiente de sandbox para testes:
- **URL**: `https://sandbox.seu-dominio.com/api`
- **API Key**: `sandbox_test_key_123`

## 📞 Support

- **Email**: api-support@imoveiscaixapro.com.br
- **Discord**: [#api-support](https://discord.gg/imoveiscaixapro)
- **Status Page**: https://status.seu-dominio.com

