# Plataforma Inteligente de Análise de Imóveis Caixa

## 🎯 Visão Geral do Projeto

Plataforma web que automatiza a coleta, enriquecimento e análise de imóveis da Caixa Econômica Federal, utilizando IA generativa para extrair informações críticas e identificar oportunidades de investimento.

## 📊 Análise dos Dados Disponíveis

### Dados do CSV Principal
- **Total de imóveis**: 35.708 propriedades
- **Cobertura nacional**: Todos os estados brasileiros
- **Principais estados**: RJ (11.361), GO (5.964), SP (3.201)
- **Tipos de imóveis**: Apartamentos (53%), Casas (42%), Terrenos (3%), Outros (2%)
- **Modalidades**: Venda Direta Online (63%), Leilão SFI (27%), Licitação Aberta (8%)

### Informações Críticas Identificadas

#### ✅ Disponíveis no CSV
- Localização completa (UF, cidade, bairro, endereço)
- Preços e valores de avaliação
- Descontos aplicados
- Descrição básica com áreas e cômodos
- Links para páginas de detalhes

#### 🔍 Necessárias via Scraping + IA
- **FINANCIAMENTO** (informação crítica para investidores)
- Regras de pagamento (à vista, parcelado, FGTS)
- Responsabilidade por condomínio e tributos
- Status de ocupação do imóvel
- Documentação disponível (matrícula, certidões)
- Fotos do imóvel

#### 📋 Disponíveis na Matrícula (PDF)
- Histórico de proprietários
- Valores anteriores de transação
- Ano de construção
- Situação jurídica
- Inscrição imobiliária
- Confrontações e medidas exatas

## 🧠 Sistema de IA Adaptável e Otimizado

### Estratégia de Otimização de Custos

#### 1. **Sistema Híbrido de Extração**
```
Nível 1: Parser Tradicional (Gratuito)
├── Regex para campos estruturados conhecidos
├── Extração de preços, áreas, quartos
└── Fallback para IA apenas quando necessário

Nível 2: IA Seletiva (Custo Controlado)
├── Apenas para campos críticos não estruturados
├── Financiamento, regras de pagamento
└── Validação de mudanças na estrutura

Nível 3: IA Completa (Sob Demanda)
├── Análise completa de PDFs de matrícula
├── Enriquecimento com dados externos
└── Recomendações personalizadas
```

#### 2. **Cache Inteligente**
- **Cache de estrutura**: Mapear padrões HTML uma vez por mês
- **Cache de resultados**: Armazenar análises de IA por 30 dias
- **Versionamento**: Detectar mudanças na estrutura automaticamente

#### 3. **Processamento em Lote**
- Agrupar múltiplos imóveis em uma única chamada de IA
- Processar apenas imóveis novos ou modificados
- Priorizar imóveis com maior potencial de investimento

### Arquitetura do Sistema de IA

#### Prompt Otimizado para Bedrock
```json
{
  "system": "Você é um especialista em análise de imóveis. Extraia APENAS as informações solicitadas em formato JSON estruturado.",
  "user": "Analise este HTML de imóvel da Caixa e extraia:\n1. Aceita financiamento? (sim/não/não informado)\n2. Formas de pagamento aceitas\n3. Responsável por condomínio\n4. Responsável por tributos\n5. Status de ocupação\n\nHTML: [conteúdo]",
  "response_format": "json"
}
```

#### Sistema de Detecção de Mudanças
```python
def detectar_mudancas_estrutura(html_atual, template_conhecido):
    """
    Compara estrutura HTML atual com template conhecido
    Retorna: necessita_ia (bool), confianca_parser (float)
    """
    # Análise de similaridade estrutural
    # Se confiança < 80%, acionar IA para reaprender
    pass
```

## 🏗️ Arquitetura Técnica Atualizada

### Stack Tecnológico
- **Backend**: Laravel 11 + PostgreSQL
- **Frontend**: Livewire + TailwindCSS + Alpine.js
- **IA**: Amazon Bedrock (Claude/Titan)
- **Cache**: Redis
- **Hospedagem**: AWS EC2 + RDS
- **Storage**: S3 para imagens e PDFs

### Módulos Principais

#### 1. **Scraper Inteligente**
```php
class ScraperInteligente {
    public function extrairDadosImovel($url) {
        // 1. Tentar parser tradicional
        $dados = $this->parserTradicional($url);
        
        // 2. Verificar campos críticos
        if (!$dados['financiamento'] || !$dados['pagamento']) {
            $dados = $this->chamarIA($url, $dados);
        }
        
        return $dados;
    }
    
    private function chamarIA($url, $dadosExistentes) {
        // Prompt otimizado para extrair apenas campos faltantes
        $prompt = $this->construirPromptSeletivo($dadosExistentes);
        return $this->bedrock->analisar($prompt);
    }
}
```

#### 2. **Sistema de Cache Inteligente**
```php
class CacheInteligente {
    public function obterAnaliseImovel($id) {
        // 1. Verificar cache local
        if ($cache = $this->redis->get("imovel:$id")) {
            return $cache;
        }
        
        // 2. Verificar se estrutura mudou
        if ($this->estruturaMudou()) {
            $this->reprocessarComIA($id);
        }
        
        // 3. Processar normalmente
        return $this->processarImovel($id);
    }
}
```

#### 3. **Extrator de Matrícula PDF**
```php
class ExtratorMatricula {
    public function analisarPDF($pdfPath) {
        // 1. Extrair texto do PDF
        $texto = $this->extrairTexto($pdfPath);
        
        // 2. Prompt específico para matrícula
        $prompt = "Extraia da matrícula: número, ano construção, 
                   último valor venda, proprietário anterior, 
                   situação jurídica";
        
        return $this->bedrock->analisar($prompt, $texto);
    }
}
```

## 🎯 Funcionalidades Críticas Implementadas

### 1. **Detecção de Financiamento**
- Parser específico para identificar "Aceita financiamento"
- Extração de modalidades (FGTS, SFH, recursos próprios)
- Análise de restrições e condições

### 2. **Análise de Viabilidade Financeira**
- Comparação com preços de mercado
- Cálculo de ROI potencial
- Análise de custos adicionais (condomínio, IPTU)

### 3. **Sistema de Alertas Inteligentes**
- Notificações para imóveis com financiamento disponível
- Alertas de oportunidades (desconto > 40% + financiamento)
- Monitoramento de mudanças de status

## 💡 Otimizações de Custo da IA

### Estratégias Implementadas

#### 1. **Processamento Seletivo**
- IA acionada apenas para campos não estruturados
- Priorização por potencial de investimento
- Reprocessamento apenas quando necessário

#### 2. **Prompts Otimizados**
- Prompts específicos e concisos
- Formato de resposta JSON estruturado
- Evitar análises desnecessárias

#### 3. **Cache Multinível**
```
Cache L1: Resultados de IA (30 dias)
Cache L2: Estrutura HTML (7 dias)  
Cache L3: Análises de mercado (24h)
```

#### 4. **Processamento em Lote**
- Agrupar até 10 imóveis por chamada de IA
- Processamento noturno para reduzir custos
- Priorização por relevância

## 📈 Métricas de Eficiência

### Redução de Custos Esperada
- **90% menos chamadas de IA** com cache inteligente
- **70% menos tokens** com prompts otimizados
- **50% menos reprocessamento** com detecção de mudanças

### Performance
- Processamento de 1.000 imóveis/hora
- Latência < 2s para consultas em cache
- Disponibilidade 99.9%

## 🚀 Roadmap de Implementação

### Fase 1: Base de Dados e Parser Híbrido
- Estrutura do banco PostgreSQL
- Parser tradicional para campos conhecidos
- Sistema de cache Redis

### Fase 2: Integração com IA Seletiva
- Integração com Amazon Bedrock
- Sistema de detecção de financiamento
- Cache inteligente de resultados

### Fase 3: Interface e Visualização
- Dashboard responsivo
- Filtros por financiamento
- Mapas interativos

### Fase 4: Análise Avançada
- Comparação com mercado
- Recomendações personalizadas
- Sistema de alertas

## 🔧 Implementação Técnica

### Estrutura do Banco de Dados
```sql
-- Tabela principal de imóveis
CREATE TABLE imoveis (
    id SERIAL PRIMARY KEY,
    numero_imovel VARCHAR(50) UNIQUE,
    uf VARCHAR(2),
    cidade VARCHAR(100),
    bairro VARCHAR(100),
    endereco TEXT,
    preco DECIMAL(12,2),
    valor_avaliacao DECIMAL(12,2),
    desconto DECIMAL(5,2),
    
    -- Campos extraídos por IA
    aceita_financiamento BOOLEAN,
    formas_pagamento JSONB,
    responsavel_condominio VARCHAR(50),
    responsavel_tributos VARCHAR(50),
    status_ocupacao VARCHAR(50),
    
    -- Metadados
    ultima_atualizacao TIMESTAMP,
    fonte_dados VARCHAR(20) DEFAULT 'parser',
    confianca_dados DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de análises de IA
CREATE TABLE analises_ia (
    id SERIAL PRIMARY KEY,
    imovel_id INTEGER REFERENCES imoveis(id),
    tipo_analise VARCHAR(50),
    resultado JSONB,
    custo_tokens INTEGER,
    modelo_usado VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de cache de estruturas
CREATE TABLE cache_estruturas (
    id SERIAL PRIMARY KEY,
    url_pattern VARCHAR(200),
    estrutura_html TEXT,
    campos_extraiveis JSONB,
    confianca DECIMAL(3,2),
    valido_ate TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Sistema de Monitoramento de Custos
```php
class MonitorCustosIA {
    public function calcularCustoEstimado($texto, $modelo = 'claude') {
        $tokens = $this->contarTokens($texto);
        $custoToken = $this->obterCustoToken($modelo);
        return $tokens * $custoToken;
    }
    
    public function aprovarChamadaIA($custoEstimado) {
        $orcamentoDisponivel = $this->obterOrcamentoMensal();
        return $custoEstimado <= $orcamentoDisponivel;
    }
}
```

## 🎯 Próximos Passos

1. **Implementar parser híbrido** com fallback para IA
2. **Criar sistema de detecção de financiamento** 
3. **Desenvolver cache inteligente** para otimizar custos
4. **Integrar Amazon Bedrock** com prompts otimizados
5. **Construir interface focada em financiamento**

Esta abordagem garante máxima eficiência, custos controlados e adaptabilidade a mudanças futuras no sistema da Caixa.

