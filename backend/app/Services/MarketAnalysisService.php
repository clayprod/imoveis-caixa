<?php

namespace App\Services;

use App\Models\Imovel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;

class MarketAnalysisService
{
    private $googleMapsService;
    private $bedrockService;
    
    public function __construct(GoogleMapsService $googleMapsService, BedrockService $bedrockService)
    {
        $this->googleMapsService = $googleMapsService;
        $this->bedrockService = $bedrockService;
    }
    
    /**
     * Analisa oportunidades de investimento para um imóvel
     */
    public function analyzeInvestmentOpportunity(Imovel $imovel): array
    {
        $analysis = [
            'imovel_id' => $imovel->id,
            'score_geral' => 0,
            'recomendacao' => 'neutro',
            'fatores' => [],
            'comparacao_mercado' => [],
            'projecoes' => [],
            'riscos' => [],
            'oportunidades' => []
        ];
        
        // 1. Análise de Localização
        $locationAnalysis = $this->analyzeLocation($imovel);
        $analysis['fatores']['localizacao'] = $locationAnalysis;
        
        // 2. Análise de Preço vs Mercado
        $priceAnalysis = $this->analyzePriceVsMarket($imovel);
        $analysis['fatores']['preco'] = $priceAnalysis;
        
        // 3. Análise de Potencial de Valorização
        $appreciationAnalysis = $this->analyzeAppreciationPotential($imovel);
        $analysis['fatores']['valorizacao'] = $appreciationAnalysis;
        
        // 4. Análise de Rentabilidade
        $profitabilityAnalysis = $this->analyzeProfitability($imovel);
        $analysis['fatores']['rentabilidade'] = $profitabilityAnalysis;
        
        // 5. Análise de Riscos
        $riskAnalysis = $this->analyzeRisks($imovel);
        $analysis['fatores']['riscos'] = $riskAnalysis;
        
        // Calcula score geral
        $analysis['score_geral'] = $this->calculateOverallScore($analysis['fatores']);
        
        // Gera recomendação
        $analysis['recomendacao'] = $this->generateRecommendation($analysis['score_geral']);
        
        // Usa IA para análise complementar
        $aiAnalysis = $this->getAIAnalysis($imovel, $analysis);
        $analysis['ai_insights'] = $aiAnalysis;
        
        return $analysis;
    }
    
    /**
     * Analisa a localização do imóvel
     */
    private function analyzeLocation(Imovel $imovel): array
    {
        $address = $this->buildFullAddress($imovel);
        $geocode = $this->googleMapsService->geocodeAddress($address);
        
        if (!$geocode) {
            return [
                'score' => 0,
                'status' => 'erro',
                'message' => 'Não foi possível geocodificar o endereço'
            ];
        }
        
        // Análise de qualidade da localização
        $locationQuality = $this->googleMapsService->analyzeLocationQuality(
            $geocode['latitude'],
            $geocode['longitude']
        );
        
        // Salva coordenadas no imóvel se não existirem
        if (!$imovel->latitude || !$imovel->longitude) {
            $imovel->update([
                'latitude' => $geocode['latitude'],
                'longitude' => $geocode['longitude'],
                'endereco_completo' => $geocode['formatted_address']
            ]);
        }
        
        return [
            'score' => $locationQuality['score'],
            'classificacao' => $locationQuality['classification'],
            'fatores' => $locationQuality['factors'],
            'amenidades_proximas' => $locationQuality['nearby_amenities'],
            'coordenadas' => [
                'latitude' => $geocode['latitude'],
                'longitude' => $geocode['longitude']
            ]
        ];
    }
    
    /**
     * Analisa preço vs mercado
     */
    private function analyzePriceVsMarket(Imovel $imovel): array
    {
        // Busca imóveis similares na região
        $similarProperties = $this->findSimilarProperties($imovel);
        
        if ($similarProperties->isEmpty()) {
            return [
                'score' => 50,
                'status' => 'dados_insuficientes',
                'message' => 'Poucos dados para comparação'
            ];
        }
        
        $avgMarketPrice = $similarProperties->avg('valor_avaliacao');
        $medianMarketPrice = $this->calculateMedian($similarProperties->pluck('valor_avaliacao'));
        
        $priceRatio = $imovel->valor_venda / $avgMarketPrice;
        
        // Score baseado no desconto
        $score = 0;
        if ($priceRatio <= 0.6) { // 40%+ desconto
            $score = 100;
        } elseif ($priceRatio <= 0.7) { // 30%+ desconto
            $score = 85;
        } elseif ($priceRatio <= 0.8) { // 20%+ desconto
            $score = 70;
        } elseif ($priceRatio <= 0.9) { // 10%+ desconto
            $score = 55;
        } elseif ($priceRatio <= 1.0) { // Preço de mercado
            $score = 40;
        } else { // Acima do mercado
            $score = 20;
        }
        
        return [
            'score' => $score,
            'preco_imovel' => $imovel->valor_venda,
            'preco_medio_mercado' => round($avgMarketPrice),
            'preco_mediano_mercado' => round($medianMarketPrice),
            'desconto_percentual' => round((1 - $priceRatio) * 100, 1),
            'comparacao' => $priceRatio < 1 ? 'abaixo_mercado' : ($priceRatio > 1 ? 'acima_mercado' : 'mercado'),
            'imoveis_comparados' => $similarProperties->count()
        ];
    }
    
    /**
     * Analisa potencial de valorização
     */
    private function analyzeAppreciationPotential(Imovel $imovel): array
    {
        $factors = [];
        $score = 50; // Score base
        
        // Análise baseada em dados históricos da região
        $historicalData = $this->getHistoricalPriceData($imovel->cidade, $imovel->uf);
        
        if ($historicalData) {
            $appreciationRate = $historicalData['taxa_valorizacao_anual'];
            
            if ($appreciationRate > 8) {
                $score += 25;
                $factors[] = 'Alta valorização histórica na região';
            } elseif ($appreciationRate > 5) {
                $score += 15;
                $factors[] = 'Valorização moderada na região';
            } elseif ($appreciationRate > 2) {
                $score += 5;
                $factors[] = 'Valorização baixa na região';
            } else {
                $score -= 10;
                $factors[] = 'Região com pouca valorização';
            }
        }
        
        // Análise de desenvolvimento urbano
        $developmentFactors = $this->analyzeDevelopmentFactors($imovel);
        $score += $developmentFactors['score'];
        $factors = array_merge($factors, $developmentFactors['factors']);
        
        return [
            'score' => min(100, max(0, $score)),
            'fatores' => $factors,
            'taxa_valorizacao_estimada' => $this->estimateAppreciationRate($imovel),
            'horizonte_analise' => '5 anos'
        ];
    }
    
    /**
     * Analisa rentabilidade do investimento
     */
    private function analyzeProfitability(Imovel $imovel): array
    {
        // Estima valor de aluguel baseado em imóveis similares
        $estimatedRent = $this->estimateRentalValue($imovel);
        
        if (!$estimatedRent) {
            return [
                'score' => 0,
                'status' => 'erro',
                'message' => 'Não foi possível estimar valor de locação'
            ];
        }
        
        // Calcula métricas de rentabilidade
        $totalInvestment = $this->calculateTotalInvestment($imovel);
        $annualRent = $estimatedRent * 12;
        $grossYield = ($annualRent / $totalInvestment) * 100;
        
        // Considera custos operacionais (20% da receita bruta)
        $netYield = $grossYield * 0.8;
        
        // Score baseado na rentabilidade líquida
        $score = 0;
        if ($netYield >= 10) {
            $score = 100;
        } elseif ($netYield >= 8) {
            $score = 85;
        } elseif ($netYield >= 6) {
            $score = 70;
        } elseif ($netYield >= 4) {
            $score = 50;
        } elseif ($netYield >= 2) {
            $score = 30;
        } else {
            $score = 10;
        }
        
        return [
            'score' => $score,
            'aluguel_estimado' => round($estimatedRent),
            'receita_anual' => round($annualRent),
            'investimento_total' => round($totalInvestment),
            'rentabilidade_bruta' => round($grossYield, 2),
            'rentabilidade_liquida' => round($netYield, 2),
            'payback_anos' => round($totalInvestment / ($annualRent * 0.8), 1)
        ];
    }
    
    /**
     * Analisa riscos do investimento
     */
    private function analyzeRisks(Imovel $imovel): array
    {
        $risks = [];
        $riskScore = 0; // Quanto maior, mais arriscado
        
        // Risco de ocupação
        if ($imovel->situacao_ocupacao === 'ocupado') {
            $riskScore += 30;
            $risks[] = [
                'tipo' => 'ocupacao',
                'nivel' => 'alto',
                'descricao' => 'Imóvel ocupado - necessário processo de despejo'
            ];
        }
        
        // Risco de financiamento
        if (!$imovel->aceita_financiamento) {
            $riskScore += 15;
            $risks[] = [
                'tipo' => 'financiamento',
                'nivel' => 'medio',
                'descricao' => 'Pagamento apenas à vista - menor liquidez'
            ];
        }
        
        // Risco de localização
        $locationScore = $this->analyzeLocation($imovel)['score'] ?? 50;
        if ($locationScore < 40) {
            $riskScore += 20;
            $risks[] = [
                'tipo' => 'localizacao',
                'nivel' => 'alto',
                'descricao' => 'Localização com poucos atrativos'
            ];
        }
        
        // Risco de liquidez baseado no tipo de imóvel
        $liquidityRisk = $this->assessLiquidityRisk($imovel);
        $riskScore += $liquidityRisk['score'];
        if ($liquidityRisk['score'] > 0) {
            $risks[] = $liquidityRisk;
        }
        
        // Converte para score de segurança (inverso do risco)
        $safetyScore = max(0, 100 - $riskScore);
        
        return [
            'score' => $safetyScore,
            'nivel_risco' => $this->classifyRiskLevel($riskScore),
            'riscos_identificados' => $risks,
            'recomendacoes' => $this->generateRiskMitigationRecommendations($risks)
        ];
    }
    
    /**
     * Busca imóveis similares para comparação
     */
    private function findSimilarProperties(Imovel $imovel): Collection
    {
        return Imovel::where('cidade', $imovel->cidade)
            ->where('uf', $imovel->uf)
            ->where('tipo_imovel', $imovel->tipo_imovel)
            ->where('id', '!=', $imovel->id)
            ->whereBetween('area_total', [
                $imovel->area_total * 0.7,
                $imovel->area_total * 1.3
            ])
            ->limit(20)
            ->get();
    }
    
    /**
     * Calcula investimento total necessário
     */
    private function calculateTotalInvestment(Imovel $imovel): float
    {
        $investmentBase = $imovel->valor_venda;
        
        // Custos adicionais estimados
        $itbi = $investmentBase * 0.02; // 2%
        $cartorio = $investmentBase * 0.015; // 1.5%
        $leilao = $investmentBase * 0.05; // 5%
        $reforma = $investmentBase * 0.1; // 10% estimado para reformas básicas
        
        return $investmentBase + $itbi + $cartorio + $leilao + $reforma;
    }
    
    /**
     * Estima valor de aluguel
     */
    private function estimateRentalValue(Imovel $imovel): ?float
    {
        // Busca imóveis similares com dados de locação
        $similarRentals = $this->findSimilarRentals($imovel);
        
        if ($similarRentals->isEmpty()) {
            // Usa regra geral: 0.5% a 0.8% do valor do imóvel
            return $imovel->valor_venda * 0.006; // 0.6%
        }
        
        return $similarRentals->avg('valor_aluguel_estimado');
    }
    
    /**
     * Calcula score geral
     */
    private function calculateOverallScore(array $factors): int
    {
        $weights = [
            'localizacao' => 0.25,
            'preco' => 0.30,
            'valorizacao' => 0.20,
            'rentabilidade' => 0.20,
            'riscos' => 0.05
        ];
        
        $totalScore = 0;
        foreach ($factors as $factor => $data) {
            if (isset($data['score']) && isset($weights[$factor])) {
                $totalScore += $data['score'] * $weights[$factor];
            }
        }
        
        return round($totalScore);
    }
    
    /**
     * Gera recomendação baseada no score
     */
    private function generateRecommendation(int $score): string
    {
        if ($score >= 80) {
            return 'forte_compra';
        } elseif ($score >= 65) {
            return 'compra';
        } elseif ($score >= 50) {
            return 'neutro';
        } elseif ($score >= 35) {
            return 'cautela';
        } else {
            return 'evitar';
        }
    }
    
    /**
     * Obtém análise de IA complementar
     */
    private function getAIAnalysis(Imovel $imovel, array $analysis): array
    {
        $prompt = $this->buildAIAnalysisPrompt($imovel, $analysis);
        
        try {
            $aiResponse = $this->bedrockService->generateAnalysis($prompt);
            return [
                'insights' => $aiResponse['insights'] ?? [],
                'recomendacoes' => $aiResponse['recommendations'] ?? [],
                'alertas' => $aiResponse['alerts'] ?? []
            ];
        } catch (\Exception $e) {
            Log::error('AI Analysis failed', [
                'imovel_id' => $imovel->id,
                'error' => $e->getMessage()
            ]);
            
            return [
                'insights' => [],
                'recomendacoes' => [],
                'alertas' => ['Análise de IA temporariamente indisponível']
            ];
        }
    }
    
    /**
     * Constrói endereço completo
     */
    private function buildFullAddress(Imovel $imovel): string
    {
        $parts = array_filter([
            $imovel->endereco,
            $imovel->numero,
            $imovel->bairro,
            $imovel->cidade,
            $imovel->uf,
            $imovel->cep
        ]);
        
        return implode(', ', $parts);
    }
    
    /**
     * Calcula mediana
     */
    private function calculateMedian(Collection $values): float
    {
        $sorted = $values->sort()->values();
        $count = $sorted->count();
        
        if ($count === 0) return 0;
        
        if ($count % 2 === 0) {
            return ($sorted[$count / 2 - 1] + $sorted[$count / 2]) / 2;
        } else {
            return $sorted[floor($count / 2)];
        }
    }
    
    // Métodos auxiliares adicionais...
    private function getHistoricalPriceData(string $city, string $state): ?array
    {
        // Implementar integração com APIs de dados históricos
        return null;
    }
    
    private function analyzeDevelopmentFactors(Imovel $imovel): array
    {
        return ['score' => 0, 'factors' => []];
    }
    
    private function estimateAppreciationRate(Imovel $imovel): float
    {
        return 5.0; // 5% ao ano como padrão
    }
    
    private function findSimilarRentals(Imovel $imovel): Collection
    {
        return collect();
    }
    
    private function assessLiquidityRisk(Imovel $imovel): array
    {
        return ['score' => 0, 'tipo' => 'liquidez', 'nivel' => 'baixo', 'descricao' => 'Liquidez adequada'];
    }
    
    private function classifyRiskLevel(int $riskScore): string
    {
        if ($riskScore >= 60) return 'alto';
        if ($riskScore >= 30) return 'medio';
        return 'baixo';
    }
    
    private function generateRiskMitigationRecommendations(array $risks): array
    {
        return [];
    }
    
    private function buildAIAnalysisPrompt(Imovel $imovel, array $analysis): string
    {
        return "Analise este imóvel em leilão da Caixa e forneça insights adicionais...";
    }
}

