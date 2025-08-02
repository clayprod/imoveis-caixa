<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Carbon\Carbon;

class IntelligentCacheService
{
    private $defaultTtl = 86400; // 24 horas
    private $aiCacheTtl = 604800; // 7 dias para resultados de IA
    private $structureCacheTtl = 2592000; // 30 dias para estruturas de página
    
    /**
     * Cache inteligente para resultados de extração de IA
     */
    public function cacheAIExtraction($htmlContent, $extractedData, $confidence = 1.0)
    {
        $cacheKey = $this->generateAIExtractionKey($htmlContent);
        
        $cacheData = [
            'data' => $extractedData,
            'confidence' => $confidence,
            'cached_at' => now()->toISOString(),
            'html_hash' => md5($htmlContent),
            'version' => '1.0',
        ];
        
        // TTL baseado na confiança - maior confiança = cache mais longo
        $ttl = $this->calculateTTL($confidence, $this->aiCacheTtl);
        
        Cache::put($cacheKey, $cacheData, $ttl);
        
        // Manter estatísticas de cache
        $this->updateCacheStats('ai_extraction', 'store');
        
        Log::debug("Cache AI armazenado", [
            'key' => $cacheKey,
            'confidence' => $confidence,
            'ttl' => $ttl
        ]);
    }

    /**
     * Recupera dados de extração de IA do cache
     */
    public function getAIExtraction($htmlContent, $minConfidence = 0.8)
    {
        $cacheKey = $this->generateAIExtractionKey($htmlContent);
        $cached = Cache::get($cacheKey);
        
        if (!$cached) {
            $this->updateCacheStats('ai_extraction', 'miss');
            return null;
        }
        
        // Verificar se a confiança é suficiente
        if ($cached['confidence'] < $minConfidence) {
            $this->updateCacheStats('ai_extraction', 'low_confidence');
            return null;
        }
        
        // Verificar se o HTML mudou significativamente
        if ($this->hasSignificantChange($htmlContent, $cached['html_hash'])) {
            Cache::forget($cacheKey);
            $this->updateCacheStats('ai_extraction', 'invalidated');
            return null;
        }
        
        $this->updateCacheStats('ai_extraction', 'hit');
        
        Log::debug("Cache AI recuperado", [
            'key' => $cacheKey,
            'confidence' => $cached['confidence']
        ]);
        
        return $cached['data'];
    }

    /**
     * Cache para estruturas de página conhecidas
     */
    public function cachePageStructure($url, $selectors, $confidence = 1.0)
    {
        $cacheKey = "page_structure:" . md5($url);
        
        $structureData = [
            'selectors' => $selectors,
            'confidence' => $confidence,
            'url' => $url,
            'cached_at' => now()->toISOString(),
            'usage_count' => 0,
            'success_rate' => 1.0,
        ];
        
        Cache::put($cacheKey, $structureData, $this->structureCacheTtl);
        
        Log::info("Estrutura de página cacheada", [
            'url' => $url,
            'selectors_count' => count($selectors)
        ]);
    }

    /**
     * Recupera estrutura de página do cache
     */
    public function getPageStructure($url)
    {
        $cacheKey = "page_structure:" . md5($url);
        $cached = Cache::get($cacheKey);
        
        if ($cached) {
            // Atualizar estatísticas de uso
            $cached['usage_count']++;
            Cache::put($cacheKey, $cached, $this->structureCacheTtl);
            
            return $cached['selectors'];
        }
        
        return null;
    }

    /**
     * Atualiza taxa de sucesso de uma estrutura
     */
    public function updateStructureSuccessRate($url, $success)
    {
        $cacheKey = "page_structure:" . md5($url);
        $cached = Cache::get($cacheKey);
        
        if ($cached) {
            $currentRate = $cached['success_rate'];
            $usageCount = $cached['usage_count'];
            
            // Calcular nova taxa de sucesso
            $newRate = (($currentRate * $usageCount) + ($success ? 1 : 0)) / ($usageCount + 1);
            
            $cached['success_rate'] = $newRate;
            $cached['last_updated'] = now()->toISOString();
            
            // Se a taxa de sucesso for muito baixa, reduzir TTL
            if ($newRate < 0.5) {
                $ttl = $this->structureCacheTtl / 10; // Reduzir para 3 dias
                Cache::put($cacheKey, $cached, $ttl);
            } else {
                Cache::put($cacheKey, $cached, $this->structureCacheTtl);
            }
            
            Log::debug("Taxa de sucesso atualizada", [
                'url' => $url,
                'success_rate' => $newRate,
                'usage_count' => $usageCount + 1
            ]);
        }
    }

    /**
     * Cache para resultados de análise de mercado
     */
    public function cacheMarketAnalysis($region, $propertyType, $analysisData)
    {
        $cacheKey = "market_analysis:" . md5($region . $propertyType);
        
        $cacheData = [
            'data' => $analysisData,
            'region' => $region,
            'property_type' => $propertyType,
            'cached_at' => now()->toISOString(),
        ];
        
        // Cache de análise de mercado por 6 horas
        Cache::put($cacheKey, $cacheData, 21600);
    }

    /**
     * Recupera análise de mercado do cache
     */
    public function getMarketAnalysis($region, $propertyType)
    {
        $cacheKey = "market_analysis:" . md5($region . $propertyType);
        $cached = Cache::get($cacheKey);
        
        return $cached ? $cached['data'] : null;
    }

    /**
     * Sistema de cache para prevenção de rate limiting
     */
    public function canMakeAPICall($service, $identifier = 'default')
    {
        $rateLimits = [
            'bedrock' => ['limit' => 100, 'window' => 3600], // 100 calls per hour
            'google_maps' => ['limit' => 1000, 'window' => 86400], // 1000 calls per day
            'caixa_scraping' => ['limit' => 500, 'window' => 3600], // 500 calls per hour
        ];
        
        if (!isset($rateLimits[$service])) {
            return true;
        }
        
        $limit = $rateLimits[$service]['limit'];
        $window = $rateLimits[$service]['window'];
        
        $cacheKey = "rate_limit:{$service}:{$identifier}";
        $currentCount = Cache::get($cacheKey, 0);
        
        if ($currentCount >= $limit) {
            Log::warning("Rate limit atingido", [
                'service' => $service,
                'identifier' => $identifier,
                'current_count' => $currentCount,
                'limit' => $limit
            ]);
            return false;
        }
        
        // Incrementar contador
        Cache::put($cacheKey, $currentCount + 1, $window);
        
        return true;
    }

    /**
     * Cache inteligente para evitar reprocessamento
     */
    public function shouldProcessProperty($propertyCode, $lastModified = null)
    {
        $cacheKey = "property_processed:" . $propertyCode;
        $lastProcessed = Cache::get($cacheKey);
        
        if (!$lastProcessed) {
            return true;
        }
        
        // Se temos data de modificação, comparar
        if ($lastModified) {
            $lastModifiedTime = Carbon::parse($lastModified);
            $lastProcessedTime = Carbon::parse($lastProcessed);
            
            return $lastModifiedTime->isAfter($lastProcessedTime);
        }
        
        // Caso contrário, verificar se passou tempo suficiente
        $lastProcessedTime = Carbon::parse($lastProcessed);
        return $lastProcessedTime->isBefore(now()->subHours(12));
    }

    /**
     * Marca propriedade como processada
     */
    public function markPropertyProcessed($propertyCode)
    {
        $cacheKey = "property_processed:" . $propertyCode;
        Cache::put($cacheKey, now()->toISOString(), $this->defaultTtl);
    }

    /**
     * Limpa cache inteligentemente baseado em padrões de uso
     */
    public function intelligentCacheCleanup()
    {
        $stats = $this->getCacheStats();
        
        // Limpar caches com baixa taxa de acerto
        $this->cleanupLowHitRateCache($stats);
        
        // Limpar caches antigos
        $this->cleanupExpiredCache();
        
        // Otimizar estruturas de cache
        $this->optimizeCacheStructures();
        
        Log::info("Limpeza inteligente de cache concluída", $stats);
    }

    /**
     * Gera chave de cache para extração de IA
     */
    private function generateAIExtractionKey($htmlContent)
    {
        // Usar hash do conteúdo HTML limpo para gerar chave única
        $cleanHtml = $this->cleanHtmlForCaching($htmlContent);
        return "ai_extraction:" . md5($cleanHtml);
    }

    /**
     * Limpa HTML para caching consistente
     */
    private function cleanHtmlForCaching($html)
    {
        // Remove elementos que mudam frequentemente mas não afetam extração
        $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);
        $html = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html);
        $html = preg_replace('/<!--.*?-->/is', '', $html);
        
        // Remove atributos que mudam (timestamps, IDs únicos, etc.)
        $html = preg_replace('/\s+id="[^"]*"/', '', $html);
        $html = preg_replace('/\s+data-timestamp="[^"]*"/', '', $html);
        
        // Normalizar espaços
        $html = preg_replace('/\s+/', ' ', $html);
        
        return trim($html);
    }

    /**
     * Calcula TTL baseado na confiança
     */
    private function calculateTTL($confidence, $baseTtl)
    {
        // Maior confiança = TTL mais longo
        $multiplier = max(0.1, $confidence);
        return (int) ($baseTtl * $multiplier);
    }

    /**
     * Verifica se houve mudança significativa no HTML
     */
    private function hasSignificantChange($currentHtml, $cachedHash)
    {
        $currentHash = md5($currentHtml);
        
        if ($currentHash === $cachedHash) {
            return false;
        }
        
        // Calcular similaridade usando algoritmo de distância
        $similarity = $this->calculateSimilarity($currentHtml, $cachedHash);
        
        // Se similaridade for maior que 80%, considerar como não significativo
        return $similarity < 0.8;
    }

    /**
     * Calcula similaridade entre HTMLs
     */
    private function calculateSimilarity($html1, $hash2)
    {
        // Implementação simplificada - em produção use algoritmo mais sofisticado
        $hash1 = md5($html1);
        
        // Comparar hashes por caracteres
        $matches = 0;
        $length = min(strlen($hash1), strlen($hash2));
        
        for ($i = 0; $i < $length; $i++) {
            if ($hash1[$i] === $hash2[$i]) {
                $matches++;
            }
        }
        
        return $matches / $length;
    }

    /**
     * Atualiza estatísticas de cache
     */
    private function updateCacheStats($type, $action)
    {
        $key = "cache_stats:{$type}:{$action}";
        $current = Cache::get($key, 0);
        Cache::put($key, $current + 1, 86400); // 24 horas
    }

    /**
     * Recupera estatísticas de cache
     */
    private function getCacheStats()
    {
        $types = ['ai_extraction', 'page_structure', 'market_analysis'];
        $actions = ['hit', 'miss', 'store', 'invalidated'];
        
        $stats = [];
        
        foreach ($types as $type) {
            foreach ($actions as $action) {
                $key = "cache_stats:{$type}:{$action}";
                $stats["{$type}_{$action}"] = Cache::get($key, 0);
            }
        }
        
        return $stats;
    }

    /**
     * Limpa caches com baixa taxa de acerto
     */
    private function cleanupLowHitRateCache($stats)
    {
        foreach (['ai_extraction', 'page_structure'] as $type) {
            $hits = $stats["{$type}_hit"] ?? 0;
            $misses = $stats["{$type}_miss"] ?? 0;
            
            if ($hits + $misses > 100) { // Só avaliar se tiver dados suficientes
                $hitRate = $hits / ($hits + $misses);
                
                if ($hitRate < 0.3) { // Taxa de acerto menor que 30%
                    // Limpar caches deste tipo
                    $this->clearCacheByPattern("{$type}:*");
                    Log::info("Cache limpo por baixa taxa de acerto", [
                        'type' => $type,
                        'hit_rate' => $hitRate
                    ]);
                }
            }
        }
    }

    /**
     * Limpa caches expirados
     */
    private function cleanupExpiredCache()
    {
        // Implementar lógica de limpeza de caches expirados
        // Em Redis, isso pode ser feito com SCAN e TTL
    }

    /**
     * Otimiza estruturas de cache
     */
    private function optimizeCacheStructures()
    {
        // Implementar otimizações específicas
        // Como compactação de dados, reorganização de chaves, etc.
    }

    /**
     * Limpa cache por padrão
     */
    private function clearCacheByPattern($pattern)
    {
        if (Cache::getStore() instanceof \Illuminate\Cache\RedisStore) {
            $redis = Redis::connection();
            $keys = $redis->keys($pattern);
            
            if (!empty($keys)) {
                $redis->del($keys);
            }
        }
    }
}

