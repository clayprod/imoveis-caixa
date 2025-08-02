<?php

namespace App\Services;

use Aws\BedrockRuntime\BedrockRuntimeClient;
use Aws\Exception\AwsException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class BedrockService
{
    private $client;
    private $modelId;
    private $maxTokens;
    private $temperature;
    
    public function __construct()
    {
        $this->client = new BedrockRuntimeClient([
            'region' => config('services.aws.region', 'us-east-1'),
            'version' => 'latest',
            'credentials' => [
                'key' => config('services.aws.key'),
                'secret' => config('services.aws.secret'),
            ],
        ]);
        
        $this->modelId = config('services.bedrock.model_id', 'anthropic.claude-3-haiku-20240307-v1:0');
        $this->maxTokens = config('services.bedrock.max_tokens', 4000);
        $this->temperature = config('services.bedrock.temperature', 0.1);
    }

    /**
     * Extrai dados de propriedade usando IA
     */
    public function extractPropertyData($htmlContent)
    {
        $cacheKey = 'bedrock_extraction_' . md5($htmlContent);
        
        // Verificar cache para evitar custos desnecessários
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }
        
        $prompt = $this->buildPropertyExtractionPrompt($htmlContent);
        
        try {
            $response = $this->invokeModel($prompt);
            $extractedData = $this->parsePropertyResponse($response);
            
            // Cache por 24 horas
            Cache::put($cacheKey, $extractedData, now()->addHours(24));
            
            return $extractedData;
            
        } catch (\Exception $e) {
            Log::error('Erro na extração Bedrock: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Analisa mudanças na estrutura do site da Caixa
     */
    public function analyzeStructureChanges($currentHtml, $previousHtml = null)
    {
        if (!$previousHtml) {
            $previousHtml = Cache::get('last_caixa_structure', '');
        }
        
        if (empty($previousHtml)) {
            Cache::put('last_caixa_structure', $currentHtml, now()->addDays(7));
            return ['changes_detected' => false];
        }
        
        $prompt = $this->buildStructureAnalysisPrompt($currentHtml, $previousHtml);
        
        try {
            $response = $this->invokeModel($prompt);
            $analysis = $this->parseStructureAnalysis($response);
            
            if ($analysis['changes_detected']) {
                // Atualizar estrutura de referência
                Cache::put('last_caixa_structure', $currentHtml, now()->addDays(7));
                
                // Notificar sobre mudanças
                $this->notifyStructureChanges($analysis);
            }
            
            return $analysis;
            
        } catch (\Exception $e) {
            Log::error('Erro na análise de estrutura: ' . $e->getMessage());
            return ['changes_detected' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Gera novos seletores CSS/XPath baseado em mudanças
     */
    public function generateNewSelectors($htmlContent, $targetData)
    {
        $prompt = $this->buildSelectorGenerationPrompt($htmlContent, $targetData);
        
        try {
            $response = $this->invokeModel($prompt);
            return $this->parseSelectorResponse($response);
            
        } catch (\Exception $e) {
            Log::error('Erro na geração de seletores: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Analisa oportunidades de investimento
     */
    public function analyzeInvestmentOpportunity($propertyData, $marketData = [])
    {
        $prompt = $this->buildInvestmentAnalysisPrompt($propertyData, $marketData);
        
        try {
            $response = $this->invokeModel($prompt);
            return $this->parseInvestmentAnalysis($response);
            
        } catch (\Exception $e) {
            Log::error('Erro na análise de investimento: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Gera insights sobre tendências do mercado
     */
    public function generateMarketInsights($properties, $timeframe = '30d')
    {
        $prompt = $this->buildMarketInsightsPrompt($properties, $timeframe);
        
        try {
            $response = $this->invokeModel($prompt);
            return $this->parseMarketInsights($response);
            
        } catch (\Exception $e) {
            Log::error('Erro na geração de insights: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Otimiza estratégias de leilão
     */
    public function optimizeAuctionStrategy($propertyData, $userProfile, $marketConditions)
    {
        $prompt = $this->buildAuctionStrategyPrompt($propertyData, $userProfile, $marketConditions);
        
        try {
            $response = $this->invokeModel($prompt);
            return $this->parseAuctionStrategy($response);
            
        } catch (\Exception $e) {
            Log::error('Erro na otimização de estratégia: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Invoca o modelo Bedrock
     */
    private function invokeModel($prompt, $systemPrompt = null)
    {
        $body = [
            'anthropic_version' => 'bedrock-2023-05-31',
            'max_tokens' => $this->maxTokens,
            'temperature' => $this->temperature,
            'messages' => [
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ]
        ];
        
        if ($systemPrompt) {
            $body['system'] = $systemPrompt;
        }
        
        try {
            $result = $this->client->invokeModel([
                'modelId' => $this->modelId,
                'contentType' => 'application/json',
                'accept' => 'application/json',
                'body' => json_encode($body),
            ]);
            
            $response = json_decode($result['body']->getContents(), true);
            
            if (isset($response['content'][0]['text'])) {
                return $response['content'][0]['text'];
            }
            
            throw new \Exception('Resposta inválida do Bedrock');
            
        } catch (AwsException $e) {
            Log::error('Erro AWS Bedrock: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Constrói prompt para extração de dados de propriedade
     */
    private function buildPropertyExtractionPrompt($htmlContent)
    {
        return "
        Você é um especialista em extração de dados de imóveis. Analise o HTML abaixo de uma página da Caixa Econômica Federal e extraia as informações solicitadas.

        INSTRUÇÕES IMPORTANTES:
        1. Procure especificamente por informações sobre FINANCIAMENTO - isso é CRÍTICO
        2. Extraia valores monetários no formato correto
        3. Identifique modalidade de venda (leilão, venda direta, etc.)
        4. Se não encontrar uma informação, retorne null
        5. Retorne APENAS um JSON válido

        CAMPOS OBRIGATÓRIOS:
        - aceita_financiamento (boolean): true se aceita, false se não aceita, null se indeterminado
        - valor_venda (number): valor de venda em reais
        - valor_avaliacao (number): valor de avaliação em reais
        - modalidade_venda (string): tipo de venda
        - situacao_imovel (string): situação atual
        - ocupacao (string): ocupado/desocupado
        - endereco_completo (string): endereço completo
        - descricao (string): descrição do imóvel
        - matricula (string): número da matrícula
        - area_privativa (number): área em m²
        - quartos (number): número de quartos
        - banheiros (number): número de banheiros
        - vagas_garagem (number): vagas de garagem

        HTML PARA ANÁLISE:
        {$htmlContent}

        RESPOSTA (apenas JSON):
        ";
    }

    /**
     * Constrói prompt para análise de mudanças estruturais
     */
    private function buildStructureAnalysisPrompt($currentHtml, $previousHtml)
    {
        return "
        Compare as duas estruturas HTML abaixo e identifique se houve mudanças significativas na estrutura da página de detalhes de imóveis da Caixa.

        FOQUE EM:
        1. Mudanças nos seletores CSS/XPath para campos importantes
        2. Alterações na estrutura de tabelas ou divs
        3. Novos campos ou campos removidos
        4. Mudanças nos padrões de texto para financiamento

        HTML ANTERIOR:
        {$previousHtml}

        HTML ATUAL:
        {$currentHtml}

        Retorne um JSON com:
        {
            \"changes_detected\": boolean,
            \"severity\": \"low|medium|high\",
            \"affected_fields\": [\"campo1\", \"campo2\"],
            \"recommended_actions\": [\"ação1\", \"ação2\"],
            \"new_selectors_needed\": boolean
        }
        ";
    }

    /**
     * Constrói prompt para geração de seletores
     */
    private function buildSelectorGenerationPrompt($htmlContent, $targetData)
    {
        return "
        Analise o HTML e gere seletores CSS e XPath otimizados para extrair os dados especificados.

        DADOS ALVO: " . json_encode($targetData) . "

        HTML:
        {$htmlContent}

        Retorne JSON com seletores no formato:
        {
            \"campo\": {
                \"css\": \"seletor css\",
                \"xpath\": \"seletor xpath\",
                \"confidence\": 0.95
            }
        }
        ";
    }

    /**
     * Constrói prompt para análise de investimento
     */
    private function buildInvestmentAnalysisPrompt($propertyData, $marketData)
    {
        return "
        Analise esta oportunidade de investimento imobiliário considerando os dados fornecidos.

        DADOS DO IMÓVEL: " . json_encode($propertyData) . "
        DADOS DE MERCADO: " . json_encode($marketData) . "

        Forneça análise detalhada incluindo:
        1. Score de oportunidade (0-100)
        2. Potencial de valorização
        3. Riscos identificados
        4. Recomendações de lance
        5. ROI estimado
        6. Tempo estimado para venda/aluguel

        Retorne JSON estruturado com a análise.
        ";
    }

    /**
     * Constrói prompt para insights de mercado
     */
    private function buildMarketInsightsPrompt($properties, $timeframe)
    {
        return "
        Analise os dados de imóveis e gere insights de mercado para o período de {$timeframe}.

        DADOS: " . json_encode($properties) . "

        Gere insights sobre:
        1. Tendências de preços por região
        2. Tipos de imóveis mais disponíveis
        3. Oportunidades emergentes
        4. Padrões de financiamento
        5. Recomendações estratégicas

        Retorne JSON com insights estruturados.
        ";
    }

    /**
     * Constrói prompt para estratégia de leilão
     */
    private function buildAuctionStrategyPrompt($propertyData, $userProfile, $marketConditions)
    {
        return "
        Desenvolva uma estratégia otimizada de leilão para este imóvel.

        IMÓVEL: " . json_encode($propertyData) . "
        PERFIL DO USUÁRIO: " . json_encode($userProfile) . "
        CONDIÇÕES DE MERCADO: " . json_encode($marketConditions) . "

        Forneça estratégia incluindo:
        1. Lance inicial recomendado
        2. Lance máximo sugerido
        3. Timing de lances
        4. Análise da concorrência esperada
        5. Plano B se não conseguir o imóvel
        6. Checklist pré-leilão

        Retorne JSON estruturado.
        ";
    }

    /**
     * Processa resposta de extração de propriedade
     */
    private function parsePropertyResponse($response)
    {
        try {
            // Limpar resposta para extrair apenas o JSON
            $response = trim($response);
            
            // Procurar por JSON na resposta
            if (preg_match('/\{.*\}/s', $response, $matches)) {
                $json = json_decode($matches[0], true);
                
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $json;
                }
            }
            
            // Fallback: tentar decodificar a resposta inteira
            return json_decode($response, true) ?: [];
            
        } catch (\Exception $e) {
            Log::error('Erro ao processar resposta de propriedade: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Processa análise de estrutura
     */
    private function parseStructureAnalysis($response)
    {
        try {
            $analysis = json_decode($response, true);
            
            return [
                'changes_detected' => $analysis['changes_detected'] ?? false,
                'severity' => $analysis['severity'] ?? 'low',
                'affected_fields' => $analysis['affected_fields'] ?? [],
                'recommended_actions' => $analysis['recommended_actions'] ?? [],
                'new_selectors_needed' => $analysis['new_selectors_needed'] ?? false,
            ];
            
        } catch (\Exception $e) {
            Log::error('Erro ao processar análise de estrutura: ' . $e->getMessage());
            return ['changes_detected' => false];
        }
    }

    /**
     * Processa resposta de seletores
     */
    private function parseSelectorResponse($response)
    {
        try {
            return json_decode($response, true) ?: [];
        } catch (\Exception $e) {
            Log::error('Erro ao processar seletores: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Processa análise de investimento
     */
    private function parseInvestmentAnalysis($response)
    {
        try {
            return json_decode($response, true);
        } catch (\Exception $e) {
            Log::error('Erro ao processar análise de investimento: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Processa insights de mercado
     */
    private function parseMarketInsights($response)
    {
        try {
            return json_decode($response, true) ?: [];
        } catch (\Exception $e) {
            Log::error('Erro ao processar insights: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Processa estratégia de leilão
     */
    private function parseAuctionStrategy($response)
    {
        try {
            return json_decode($response, true);
        } catch (\Exception $e) {
            Log::error('Erro ao processar estratégia: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Notifica sobre mudanças estruturais
     */
    private function notifyStructureChanges($analysis)
    {
        // Enviar notificação para administradores
        Log::warning('Mudanças detectadas na estrutura da Caixa', $analysis);
        
        // Aqui você pode implementar notificações por email, Slack, etc.
    }

    /**
     * Otimiza custos limitando uso da IA
     */
    public function shouldUseAI($context)
    {
        // Lógica para decidir quando usar IA baseado em:
        // - Falhas na extração padrão
        // - Importância do imóvel
        // - Budget disponível
        // - Horário (usar menos IA em horários de pico)
        
        $hour = now()->hour;
        $isBusinessHour = $hour >= 8 && $hour <= 18;
        
        // Usar menos IA durante horário comercial para otimizar custos
        if ($isBusinessHour && $context['priority'] !== 'high') {
            return rand(1, 100) <= 30; // 30% de chance
        }
        
        return true;
    }
}

