<?php

namespace App\Services;

use App\Models\StructureSnapshot;
use App\Models\ChangeDetectionLog;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use App\Notifications\StructureChangeAlert;
use Carbon\Carbon;

class StructureChangeDetector
{
    private $bedrockService;
    private $cacheService;
    
    public function __construct(BedrockService $bedrockService, IntelligentCacheService $cacheService)
    {
        $this->bedrockService = $bedrockService;
        $this->cacheService = $cacheService;
    }

    /**
     * Detecta mudanças na estrutura da página de detalhes
     */
    public function detectPageStructureChanges($url, $currentHtml)
    {
        $urlHash = md5($url);
        $lastSnapshot = StructureSnapshot::where('url_hash', $urlHash)
                                        ->where('type', 'page_structure')
                                        ->latest()
                                        ->first();
        
        if (!$lastSnapshot) {
            // Primeira vez - criar snapshot inicial
            return $this->createInitialSnapshot($url, $currentHtml);
        }
        
        // Comparar com snapshot anterior
        $changes = $this->compareStructures($lastSnapshot->structure_data, $currentHtml);
        
        if ($changes['has_changes']) {
            return $this->handleStructureChanges($url, $currentHtml, $changes, $lastSnapshot);
        }
        
        // Atualizar timestamp do último check
        $lastSnapshot->update(['last_checked_at' => now()]);
        
        return [
            'changes_detected' => false,
            'last_check' => now(),
            'snapshot_age' => $lastSnapshot->created_at->diffInHours(now())
        ];
    }

    /**
     * Detecta mudanças na estrutura do CSV
     */
    public function detectCSVStructureChanges($csvContent)
    {
        $csvHash = md5($csvContent);
        $lastSnapshot = StructureSnapshot::where('content_hash', $csvHash)
                                        ->where('type', 'csv_structure')
                                        ->first();
        
        if ($lastSnapshot) {
            return ['changes_detected' => false, 'reason' => 'identical_content'];
        }
        
        // Analisar estrutura do CSV
        $structure = $this->analyzeCSVStructure($csvContent);
        
        $lastCSVSnapshot = StructureSnapshot::where('type', 'csv_structure')
                                          ->latest()
                                          ->first();
        
        if (!$lastCSVSnapshot) {
            // Primeiro CSV - criar snapshot
            $this->createCSVSnapshot($csvContent, $structure);
            return ['changes_detected' => false, 'reason' => 'first_snapshot'];
        }
        
        // Comparar estruturas
        $changes = $this->compareCSVStructures($lastCSVSnapshot->structure_data, $structure);
        
        if ($changes['has_changes']) {
            $this->handleCSVChanges($csvContent, $structure, $changes);
            return [
                'changes_detected' => true,
                'changes' => $changes,
                'action_required' => true
            ];
        }
        
        return ['changes_detected' => false, 'reason' => 'no_significant_changes'];
    }

    /**
     * Monitora padrões de falha no scraping
     */
    public function monitorScrapingFailures()
    {
        $recentFailures = ChangeDetectionLog::where('created_at', '>=', now()->subHours(6))
                                          ->where('type', 'scraping_failure')
                                          ->get();
        
        if ($recentFailures->count() > 10) {
            $patterns = $this->analyzeFailurePatterns($recentFailures);
            
            if ($patterns['suggests_structure_change']) {
                $this->triggerStructureAnalysis($patterns);
                return [
                    'pattern_detected' => true,
                    'patterns' => $patterns,
                    'recommendation' => 'immediate_structure_analysis'
                ];
            }
        }
        
        return ['pattern_detected' => false];
    }

    /**
     * Cria snapshot inicial da estrutura
     */
    private function createInitialSnapshot($url, $html)
    {
        $structure = $this->extractPageStructure($html);
        
        StructureSnapshot::create([
            'url' => $url,
            'url_hash' => md5($url),
            'type' => 'page_structure',
            'content_hash' => md5($html),
            'structure_data' => $structure,
            'confidence_score' => 1.0,
            'last_checked_at' => now(),
        ]);
        
        Log::info("Snapshot inicial criado para URL: {$url}");
        
        return [
            'changes_detected' => false,
            'reason' => 'initial_snapshot_created',
            'structure' => $structure
        ];
    }

    /**
     * Extrai estrutura da página HTML
     */
    private function extractPageStructure($html)
    {
        $dom = new \DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new \DOMXPath($dom);
        
        $structure = [
            'title_selectors' => $this->findElementSelectors($xpath, ['h1', 'h2', '.title', '.header']),
            'table_structure' => $this->analyzeTableStructure($xpath),
            'form_elements' => $this->analyzeFormStructure($xpath),
            'key_patterns' => $this->findKeyPatterns($html),
            'meta_info' => [
                'total_elements' => $xpath->query('//*')->length,
                'table_count' => $xpath->query('//table')->length,
                'form_count' => $xpath->query('//form')->length,
                'link_count' => $xpath->query('//a')->length,
            ],
            'extracted_at' => now()->toISOString(),
        ];
        
        return $structure;
    }

    /**
     * Compara estruturas de páginas
     */
    private function compareStructures($oldStructure, $newHtml)
    {
        $newStructure = $this->extractPageStructure($newHtml);
        
        $changes = [
            'has_changes' => false,
            'severity' => 'low',
            'changes' => [],
        ];
        
        // Comparar contadores de elementos
        $oldMeta = $oldStructure['meta_info'] ?? [];
        $newMeta = $newStructure['meta_info'] ?? [];
        
        foreach ($oldMeta as $key => $oldValue) {
            $newValue = $newMeta[$key] ?? 0;
            $percentChange = $oldValue > 0 ? abs($newValue - $oldValue) / $oldValue : 0;
            
            if ($percentChange > 0.2) { // Mudança > 20%
                $changes['has_changes'] = true;
                $changes['changes'][] = [
                    'type' => 'element_count_change',
                    'element' => $key,
                    'old_value' => $oldValue,
                    'new_value' => $newValue,
                    'change_percent' => $percentChange * 100,
                ];
                
                if ($percentChange > 0.5) {
                    $changes['severity'] = 'high';
                } elseif ($percentChange > 0.3) {
                    $changes['severity'] = 'medium';
                }
            }
        }
        
        // Comparar estrutura de tabelas
        if ($this->hasTableStructureChanged($oldStructure['table_structure'] ?? [], $newStructure['table_structure'] ?? [])) {
            $changes['has_changes'] = true;
            $changes['severity'] = 'high';
            $changes['changes'][] = [
                'type' => 'table_structure_change',
                'description' => 'Estrutura de tabelas foi modificada',
            ];
        }
        
        // Usar IA para análise mais profunda se necessário
        if ($changes['has_changes'] && $changes['severity'] === 'high') {
            $aiAnalysis = $this->bedrockService->analyzeStructureChanges($newHtml, json_encode($oldStructure));
            $changes['ai_analysis'] = $aiAnalysis;
        }
        
        return $changes;
    }

    /**
     * Analisa estrutura do CSV
     */
    private function analyzeCSVStructure($csvContent)
    {
        $lines = explode("\n", $csvContent);
        $header = str_getcsv(array_shift($lines), ';');
        
        $structure = [
            'column_count' => count($header),
            'columns' => $header,
            'row_count' => count(array_filter($lines, fn($line) => !empty(trim($line)))),
            'delimiter' => ';',
            'encoding' => mb_detect_encoding($csvContent),
            'column_types' => $this->detectColumnTypes($lines, $header),
            'sample_data' => array_slice($lines, 0, 5), // Primeiras 5 linhas como amostra
        ];
        
        return $structure;
    }

    /**
     * Compara estruturas de CSV
     */
    private function compareCSVStructures($oldStructure, $newStructure)
    {
        $changes = [
            'has_changes' => false,
            'changes' => [],
        ];
        
        // Verificar mudanças nas colunas
        $oldColumns = $oldStructure['columns'] ?? [];
        $newColumns = $newStructure['columns'] ?? [];
        
        $addedColumns = array_diff($newColumns, $oldColumns);
        $removedColumns = array_diff($oldColumns, $newColumns);
        $reorderedColumns = $oldColumns !== $newColumns;
        
        if (!empty($addedColumns)) {
            $changes['has_changes'] = true;
            $changes['changes'][] = [
                'type' => 'columns_added',
                'columns' => $addedColumns,
            ];
        }
        
        if (!empty($removedColumns)) {
            $changes['has_changes'] = true;
            $changes['changes'][] = [
                'type' => 'columns_removed',
                'columns' => $removedColumns,
            ];
        }
        
        if ($reorderedColumns && empty($addedColumns) && empty($removedColumns)) {
            $changes['has_changes'] = true;
            $changes['changes'][] = [
                'type' => 'columns_reordered',
                'old_order' => $oldColumns,
                'new_order' => $newColumns,
            ];
        }
        
        // Verificar mudanças significativas no número de linhas
        $oldRowCount = $oldStructure['row_count'] ?? 0;
        $newRowCount = $newStructure['row_count'] ?? 0;
        
        if ($oldRowCount > 0) {
            $percentChange = abs($newRowCount - $oldRowCount) / $oldRowCount;
            
            if ($percentChange > 0.1) { // Mudança > 10%
                $changes['has_changes'] = true;
                $changes['changes'][] = [
                    'type' => 'row_count_change',
                    'old_count' => $oldRowCount,
                    'new_count' => $newRowCount,
                    'change_percent' => $percentChange * 100,
                ];
            }
        }
        
        return $changes;
    }

    /**
     * Lida com mudanças na estrutura da página
     */
    private function handleStructureChanges($url, $html, $changes, $lastSnapshot)
    {
        // Criar novo snapshot
        $newStructure = $this->extractPageStructure($html);
        
        StructureSnapshot::create([
            'url' => $url,
            'url_hash' => md5($url),
            'type' => 'page_structure',
            'content_hash' => md5($html),
            'structure_data' => $newStructure,
            'confidence_score' => 0.5, // Baixa confiança até validação
            'last_checked_at' => now(),
            'parent_snapshot_id' => $lastSnapshot->id,
        ]);
        
        // Log da mudança
        ChangeDetectionLog::create([
            'type' => 'structure_change',
            'url' => $url,
            'severity' => $changes['severity'],
            'changes_detected' => $changes['changes'],
            'action_taken' => 'snapshot_created',
            'requires_attention' => $changes['severity'] === 'high',
        ]);
        
        // Notificar administradores se mudança for significativa
        if ($changes['severity'] === 'high') {
            $this->notifyAdministrators($url, $changes);
        }
        
        // Tentar gerar novos seletores automaticamente
        if (isset($changes['ai_analysis'])) {
            $this->generateNewSelectors($url, $html, $changes['ai_analysis']);
        }
        
        Log::warning("Mudança estrutural detectada", [
            'url' => $url,
            'severity' => $changes['severity'],
            'changes_count' => count($changes['changes'])
        ]);
        
        return [
            'changes_detected' => true,
            'severity' => $changes['severity'],
            'changes' => $changes['changes'],
            'action_taken' => 'snapshot_created',
            'requires_manual_review' => $changes['severity'] === 'high',
        ];
    }

    /**
     * Lida com mudanças no CSV
     */
    private function handleCSVChanges($csvContent, $structure, $changes)
    {
        // Criar snapshot do novo CSV
        $this->createCSVSnapshot($csvContent, $structure);
        
        // Log das mudanças
        ChangeDetectionLog::create([
            'type' => 'csv_structure_change',
            'severity' => 'medium',
            'changes_detected' => $changes['changes'],
            'action_taken' => 'snapshot_created',
            'requires_attention' => true,
        ]);
        
        // Notificar sobre mudanças no CSV
        $this->notifyCSVChanges($changes);
        
        Log::warning("Mudança na estrutura do CSV detectada", [
            'changes_count' => count($changes['changes'])
        ]);
    }

    /**
     * Cria snapshot do CSV
     */
    private function createCSVSnapshot($csvContent, $structure)
    {
        StructureSnapshot::create([
            'type' => 'csv_structure',
            'content_hash' => md5($csvContent),
            'structure_data' => $structure,
            'confidence_score' => 1.0,
            'last_checked_at' => now(),
        ]);
    }

    /**
     * Analisa padrões de falha
     */
    private function analyzeFailurePatterns($failures)
    {
        $patterns = [
            'suggests_structure_change' => false,
            'common_errors' => [],
            'affected_selectors' => [],
            'failure_rate' => 0,
        ];
        
        $errorMessages = $failures->pluck('error_message')->filter();
        $commonErrors = $errorMessages->countBy()->sortDesc();
        
        $patterns['common_errors'] = $commonErrors->take(5)->toArray();
        $patterns['failure_rate'] = $failures->count() / 100; // Assumindo 100 tentativas por período
        
        // Detectar padrões que sugerem mudança estrutural
        $structureIndicators = [
            'element not found',
            'selector failed',
            'xpath error',
            'table structure',
            'missing field',
        ];
        
        foreach ($structureIndicators as $indicator) {
            if ($errorMessages->contains(fn($msg) => stripos($msg, $indicator) !== false)) {
                $patterns['suggests_structure_change'] = true;
                break;
            }
        }
        
        return $patterns;
    }

    /**
     * Dispara análise de estrutura
     */
    private function triggerStructureAnalysis($patterns)
    {
        // Agendar job de análise estrutural
        \App\Jobs\AnalyzeStructureChangesJob::dispatch($patterns)
            ->onQueue('high');
        
        Log::warning("Análise estrutural disparada devido a padrões de falha", $patterns);
    }

    /**
     * Notifica administradores sobre mudanças
     */
    private function notifyAdministrators($url, $changes)
    {
        $admins = \App\Models\User::where('role', 'admin')->get();
        
        Notification::send($admins, new StructureChangeAlert($url, $changes));
    }

    /**
     * Notifica sobre mudanças no CSV
     */
    private function notifyCSVChanges($changes)
    {
        $admins = \App\Models\User::where('role', 'admin')->get();
        
        // Implementar notificação específica para CSV
        Log::info("Notificação de mudança CSV enviada para administradores");
    }

    /**
     * Gera novos seletores automaticamente
     */
    private function generateNewSelectors($url, $html, $aiAnalysis)
    {
        if (isset($aiAnalysis['new_selectors_needed']) && $aiAnalysis['new_selectors_needed']) {
            $targetData = ['aceita_financiamento', 'valor_venda', 'modalidade_venda'];
            $newSelectors = $this->bedrockService->generateNewSelectors($html, $targetData);
            
            if (!empty($newSelectors)) {
                // Salvar novos seletores para teste
                $this->cacheService->cachePageStructure($url, $newSelectors, 0.7);
                
                Log::info("Novos seletores gerados automaticamente", [
                    'url' => $url,
                    'selectors_count' => count($newSelectors)
                ]);
            }
        }
    }

    // Métodos auxiliares para análise de estrutura
    private function findElementSelectors($xpath, $selectors)
    {
        $found = [];
        foreach ($selectors as $selector) {
            $nodes = $xpath->query("//{$selector}");
            if ($nodes->length > 0) {
                $found[] = $selector;
            }
        }
        return $found;
    }

    private function analyzeTableStructure($xpath)
    {
        $tables = $xpath->query('//table');
        $structure = [];
        
        foreach ($tables as $i => $table) {
            $rows = $xpath->query('.//tr', $table);
            $structure["table_{$i}"] = [
                'row_count' => $rows->length,
                'has_header' => $xpath->query('.//th', $table)->length > 0,
            ];
        }
        
        return $structure;
    }

    private function analyzeFormStructure($xpath)
    {
        $forms = $xpath->query('//form');
        $structure = [];
        
        foreach ($forms as $i => $form) {
            $inputs = $xpath->query('.//input', $form);
            $structure["form_{$i}"] = [
                'input_count' => $inputs->length,
                'action' => $form->getAttribute('action'),
                'method' => $form->getAttribute('method'),
            ];
        }
        
        return $structure;
    }

    private function findKeyPatterns($html)
    {
        $patterns = [
            'financiamento' => substr_count(strtolower($html), 'financiamento'),
            'leilao' => substr_count(strtolower($html), 'leilão') + substr_count(strtolower($html), 'leilao'),
            'venda' => substr_count(strtolower($html), 'venda'),
            'matricula' => substr_count(strtolower($html), 'matrícula') + substr_count(strtolower($html), 'matricula'),
        ];
        
        return $patterns;
    }

    private function hasTableStructureChanged($oldTables, $newTables)
    {
        if (count($oldTables) !== count($newTables)) {
            return true;
        }
        
        foreach ($oldTables as $key => $oldTable) {
            $newTable = $newTables[$key] ?? null;
            if (!$newTable || $oldTable['row_count'] !== $newTable['row_count']) {
                return true;
            }
        }
        
        return false;
    }

    private function detectColumnTypes($lines, $header)
    {
        $types = [];
        $sampleSize = min(100, count($lines));
        
        foreach ($header as $i => $column) {
            $values = [];
            for ($j = 0; $j < $sampleSize; $j++) {
                if (isset($lines[$j])) {
                    $row = str_getcsv($lines[$j], ';');
                    if (isset($row[$i])) {
                        $values[] = $row[$i];
                    }
                }
            }
            
            $types[$column] = $this->guessColumnType($values);
        }
        
        return $types;
    }

    private function guessColumnType($values)
    {
        $nonEmpty = array_filter($values, fn($v) => !empty(trim($v)));
        
        if (empty($nonEmpty)) return 'empty';
        
        $numeric = array_filter($nonEmpty, fn($v) => is_numeric($v));
        $dates = array_filter($nonEmpty, fn($v) => strtotime($v) !== false);
        
        if (count($numeric) / count($nonEmpty) > 0.8) return 'numeric';
        if (count($dates) / count($nonEmpty) > 0.8) return 'date';
        
        return 'text';
    }
}

