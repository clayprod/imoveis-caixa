<?php

namespace App\Services;

use App\Models\User;
use App\Models\Imovel;
use App\Models\Alert;
use App\Models\AlertTrigger;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;
use App\Mail\PropertyAlertMail;
use App\Jobs\ProcessAlertJob;

class AlertService
{
    private $marketAnalysisService;
    
    public function __construct(MarketAnalysisService $marketAnalysisService)
    {
        $this->marketAnalysisService = $marketAnalysisService;
    }
    
    /**
     * Cria um novo alerta para o usuário
     */
    public function createAlert(User $user, array $criteria): Alert
    {
        $alert = Alert::create([
            'user_id' => $user->id,
            'name' => $criteria['name'],
            'description' => $criteria['description'] ?? null,
            'criteria' => $criteria,
            'is_active' => true,
            'frequency' => $criteria['frequency'] ?? 'immediate', // immediate, daily, weekly
            'last_triggered_at' => null,
            'trigger_count' => 0
        ]);
        
        Log::info('Alert created', [
            'user_id' => $user->id,
            'alert_id' => $alert->id,
            'criteria' => $criteria
        ]);
        
        return $alert;
    }
    
    /**
     * Processa todos os alertas ativos
     */
    public function processAllAlerts(): int
    {
        $activeAlerts = Alert::where('is_active', true)->get();
        $triggeredCount = 0;
        
        foreach ($activeAlerts as $alert) {
            if ($this->shouldProcessAlert($alert)) {
                $matchingProperties = $this->findMatchingProperties($alert);
                
                if ($matchingProperties->isNotEmpty()) {
                    $this->triggerAlert($alert, $matchingProperties);
                    $triggeredCount++;
                }
            }
        }
        
        return $triggeredCount;
    }
    
    /**
     * Verifica se um alerta deve ser processado
     */
    private function shouldProcessAlert(Alert $alert): bool
    {
        if (!$alert->is_active) {
            return false;
        }
        
        // Verifica frequência
        switch ($alert->frequency) {
            case 'immediate':
                return true;
                
            case 'daily':
                return !$alert->last_triggered_at || 
                       $alert->last_triggered_at->diffInHours(now()) >= 24;
                       
            case 'weekly':
                return !$alert->last_triggered_at || 
                       $alert->last_triggered_at->diffInDays(now()) >= 7;
                       
            default:
                return true;
        }
    }
    
    /**
     * Encontra imóveis que correspondem aos critérios do alerta
     */
    private function findMatchingProperties(Alert $alert): Collection
    {
        $criteria = $alert->criteria;
        $query = Imovel::query();
        
        // Filtros básicos
        if (isset($criteria['city'])) {
            $query->where('cidade', 'like', "%{$criteria['city']}%");
        }
        
        if (isset($criteria['state'])) {
            $query->where('uf', $criteria['state']);
        }
        
        if (isset($criteria['property_type'])) {
            $query->where('tipo_imovel', $criteria['property_type']);
        }
        
        // Filtros de preço
        if (isset($criteria['min_price'])) {
            $query->where('valor_venda', '>=', $criteria['min_price']);
        }
        
        if (isset($criteria['max_price'])) {
            $query->where('valor_venda', '<=', $criteria['max_price']);
        }
        
        // Filtros de área
        if (isset($criteria['min_area'])) {
            $query->where('area_total', '>=', $criteria['min_area']);
        }
        
        if (isset($criteria['max_area'])) {
            $query->where('area_total', '<=', $criteria['max_area']);
        }
        
        // Filtros específicos
        if (isset($criteria['accepts_financing']) && $criteria['accepts_financing']) {
            $query->where('aceita_financiamento', true);
        }
        
        if (isset($criteria['occupation_status'])) {
            $query->where('situacao_ocupacao', $criteria['occupation_status']);
        }
        
        // Filtros de desconto
        if (isset($criteria['min_discount'])) {
            $query->whereRaw('((valor_avaliacao - valor_venda) / valor_avaliacao * 100) >= ?', 
                            [$criteria['min_discount']]);
        }
        
        // Filtros de qualidade (score de IA)
        if (isset($criteria['min_ai_score'])) {
            $query->where('ai_score', '>=', $criteria['min_ai_score']);
        }
        
        // Exclui imóveis já alertados recentemente
        $recentlyAlerted = AlertTrigger::where('alert_id', $alert->id)
            ->where('created_at', '>=', now()->subDays(7))
            ->pluck('imovel_id');
            
        if ($recentlyAlerted->isNotEmpty()) {
            $query->whereNotIn('id', $recentlyAlerted);
        }
        
        // Ordena por relevância (score de IA, desconto, etc.)
        $query->orderByDesc('ai_score')
              ->orderByRaw('((valor_avaliacao - valor_venda) / valor_avaliacao * 100) DESC');
        
        // Limita resultados para evitar spam
        $limit = $criteria['max_results'] ?? 10;
        
        return $query->limit($limit)->get();
    }
    
    /**
     * Dispara um alerta
     */
    private function triggerAlert(Alert $alert, Collection $properties): void
    {
        // Registra o trigger
        $alert->update([
            'last_triggered_at' => now(),
            'trigger_count' => $alert->trigger_count + 1
        ]);
        
        // Registra cada imóvel alertado
        foreach ($properties as $property) {
            AlertTrigger::create([
                'alert_id' => $alert->id,
                'imovel_id' => $property->id,
                'trigger_data' => [
                    'property_data' => $property->toArray(),
                    'analysis' => $this->getPropertyAnalysis($property),
                    'triggered_at' => now()->toISOString()
                ]
            ]);
        }
        
        // Envia notificação
        $this->sendAlertNotification($alert, $properties);
        
        Log::info('Alert triggered', [
            'alert_id' => $alert->id,
            'user_id' => $alert->user_id,
            'properties_count' => $properties->count()
        ]);
    }
    
    /**
     * Envia notificação do alerta
     */
    private function sendAlertNotification(Alert $alert, Collection $properties): void
    {
        $user = $alert->user;
        
        // Verifica se o usuário tem permissão para alertas
        if (!$user->hasFeature('alerts')) {
            return;
        }
        
        try {
            // Email
            if ($user->notification_preferences['email'] ?? true) {
                Mail::to($user->email)->send(
                    new PropertyAlertMail($alert, $properties)
                );
            }
            
            // Push notification (se implementado)
            if ($user->notification_preferences['push'] ?? false) {
                $this->sendPushNotification($user, $alert, $properties);
            }
            
            // Notificação in-app
            $this->createInAppNotification($user, $alert, $properties);
            
        } catch (\Exception $e) {
            Log::error('Failed to send alert notification', [
                'alert_id' => $alert->id,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Cria alertas inteligentes baseados no comportamento do usuário
     */
    public function createSmartAlerts(User $user): array
    {
        $createdAlerts = [];
        
        // Analisa histórico de buscas e favoritos do usuário
        $userBehavior = $this->analyzeUserBehavior($user);
        
        // Alerta para imóveis similares aos favoritos
        if (!empty($userBehavior['favorite_patterns'])) {
            foreach ($userBehavior['favorite_patterns'] as $pattern) {
                $alert = $this->createAlert($user, [
                    'name' => "Imóveis similares aos seus favoritos em {$pattern['city']}",
                    'description' => 'Alerta automático baseado nos seus imóveis favoritos',
                    'city' => $pattern['city'],
                    'state' => $pattern['state'],
                    'property_type' => $pattern['property_type'],
                    'min_price' => $pattern['price_range']['min'],
                    'max_price' => $pattern['price_range']['max'],
                    'min_ai_score' => 70,
                    'frequency' => 'daily',
                    'auto_generated' => true
                ]);
                
                $createdAlerts[] = $alert;
            }
        }
        
        // Alerta para oportunidades de alta qualidade
        if ($user->hasFeature('ai_analysis')) {
            $alert = $this->createAlert($user, [
                'name' => 'Oportunidades Premium (Score IA > 85)',
                'description' => 'Imóveis com excelente potencial identificados pela IA',
                'min_ai_score' => 85,
                'min_discount' => 20,
                'accepts_financing' => true,
                'frequency' => 'immediate',
                'auto_generated' => true
            ]);
            
            $createdAlerts[] = $alert;
        }
        
        return $createdAlerts;
    }
    
    /**
     * Analisa comportamento do usuário para alertas inteligentes
     */
    private function analyzeUserBehavior(User $user): array
    {
        $behavior = [
            'favorite_patterns' => [],
            'search_patterns' => [],
            'price_preferences' => []
        ];
        
        // Analisa favoritos
        $favorites = $user->favoriteProperties()->get();
        if ($favorites->isNotEmpty()) {
            $patterns = $favorites->groupBy(['cidade', 'uf', 'tipo_imovel']);
            
            foreach ($patterns as $city => $states) {
                foreach ($states as $state => $types) {
                    foreach ($types as $type => $properties) {
                        if ($properties->count() >= 2) { // Padrão identificado
                            $prices = $properties->pluck('valor_venda');
                            
                            $behavior['favorite_patterns'][] = [
                                'city' => $city,
                                'state' => $state,
                                'property_type' => $type,
                                'count' => $properties->count(),
                                'price_range' => [
                                    'min' => $prices->min() * 0.8,
                                    'max' => $prices->max() * 1.2
                                ]
                            ];
                        }
                    }
                }
            }
        }
        
        return $behavior;
    }
    
    /**
     * Obtém análise rápida da propriedade para o alerta
     */
    private function getPropertyAnalysis(Imovel $property): array
    {
        // Análise simplificada para alertas
        $discount = 0;
        if ($property->valor_avaliacao > 0) {
            $discount = (($property->valor_avaliacao - $property->valor_venda) / 
                        $property->valor_avaliacao) * 100;
        }
        
        return [
            'discount_percentage' => round($discount, 1),
            'ai_score' => $property->ai_score ?? 0,
            'financing_available' => $property->aceita_financiamento,
            'occupation_status' => $property->situacao_ocupacao,
            'quick_analysis' => $this->generateQuickAnalysis($property)
        ];
    }
    
    /**
     * Gera análise rápida em texto
     */
    private function generateQuickAnalysis(Imovel $property): string
    {
        $highlights = [];
        
        $discount = 0;
        if ($property->valor_avaliacao > 0) {
            $discount = (($property->valor_avaliacao - $property->valor_venda) / 
                        $property->valor_avaliacao) * 100;
        }
        
        if ($discount > 30) {
            $highlights[] = "Desconto de {$discount}%";
        }
        
        if ($property->aceita_financiamento) {
            $highlights[] = "Aceita financiamento";
        }
        
        if ($property->situacao_ocupacao === 'desocupado') {
            $highlights[] = "Desocupado";
        }
        
        if ($property->ai_score > 80) {
            $highlights[] = "Score IA alto ({$property->ai_score})";
        }
        
        return implode(' • ', $highlights);
    }
    
    /**
     * Envia push notification
     */
    private function sendPushNotification(User $user, Alert $alert, Collection $properties): void
    {
        // Implementar integração com serviço de push notifications
        // (Firebase, OneSignal, etc.)
    }
    
    /**
     * Cria notificação in-app
     */
    private function createInAppNotification(User $user, Alert $alert, Collection $properties): void
    {
        $user->notifications()->create([
            'type' => 'property_alert',
            'title' => $alert->name,
            'message' => "Encontramos {$properties->count()} " . 
                        ($properties->count() === 1 ? 'imóvel' : 'imóveis') . 
                        " que correspondem aos seus critérios",
            'data' => [
                'alert_id' => $alert->id,
                'property_count' => $properties->count(),
                'properties' => $properties->take(3)->pluck('id')
            ],
            'read_at' => null
        ]);
    }
    
    /**
     * Desativa alertas inativos
     */
    public function deactivateInactiveAlerts(): int
    {
        $inactiveThreshold = now()->subMonths(3);
        
        $deactivated = Alert::where('is_active', true)
            ->where('last_triggered_at', '<', $inactiveThreshold)
            ->where('trigger_count', 0)
            ->update(['is_active' => false]);
            
        return $deactivated;
    }
    
    /**
     * Estatísticas de alertas para o usuário
     */
    public function getUserAlertStats(User $user): array
    {
        $alerts = $user->alerts();
        
        return [
            'total_alerts' => $alerts->count(),
            'active_alerts' => $alerts->where('is_active', true)->count(),
            'total_triggers' => $alerts->sum('trigger_count'),
            'recent_triggers' => AlertTrigger::whereIn('alert_id', $alerts->pluck('id'))
                ->where('created_at', '>=', now()->subDays(30))
                ->count(),
            'most_triggered_alert' => $alerts->orderByDesc('trigger_count')->first()?->name
        ];
    }
}

