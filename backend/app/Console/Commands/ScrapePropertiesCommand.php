<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\IntelligentScrapingService;
use App\Jobs\ScrapePropertyDetailsJob;
use App\Models\Imovel;
use App\Models\ScrapingLog;

class ScrapePropertiesCommand extends Command
{
    protected $signature = 'scrape:properties 
                           {--full : Fazer scraping completo de todos os imóveis}
                           {--limit=100 : Limite de imóveis para processar}
                           {--force : Forçar scraping mesmo de imóveis recentes}
                           {--code= : Scraping de um imóvel específico}';

    protected $description = 'Executa scraping inteligente de imóveis da Caixa';

    private $scrapingService;

    public function __construct(IntelligentScrapingService $scrapingService)
    {
        parent::__construct();
        $this->scrapingService = $scrapingService;
    }

    public function handle()
    {
        $this->info('🚀 Iniciando scraping inteligente de imóveis...');
        
        $startTime = now();
        
        try {
            if ($this->option('code')) {
                return $this->scrapeSingleProperty($this->option('code'));
            }
            
            if ($this->option('full')) {
                return $this->scrapeAllProperties();
            }
            
            return $this->scrapeUpdatedProperties();
            
        } catch (\Exception $e) {
            $this->error('❌ Erro durante o scraping: ' . $e->getMessage());
            return 1;
        } finally {
            $duration = now()->diffInSeconds($startTime);
            $this->info("⏱️  Scraping concluído em {$duration} segundos");
        }
    }

    private function scrapeSingleProperty($code)
    {
        $this->info("🔍 Fazendo scraping do imóvel: {$code}");
        
        try {
            $details = $this->scrapingService->scrapePropertyDetails($code);
            
            if ($details) {
                $this->info('✅ Dados extraídos com sucesso:');
                $this->table(
                    ['Campo', 'Valor'],
                    collect($details)->map(fn($value, $key) => [$key, $value])->toArray()
                );
            } else {
                $this->warn('⚠️  Nenhum dado foi extraído');
            }
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error("❌ Erro: {$e->getMessage()}");
            return 1;
        }
    }

    private function scrapeAllProperties()
    {
        $this->info('📊 Executando scraping completo...');
        
        $result = $this->scrapingService->scrapeAllProperties();
        
        if ($result['success']) {
            $this->info("✅ Scraping completo finalizado:");
            $this->info("   • Processados: {$result['scraped']} imóveis");
            $this->info("   • Erros: {$result['errors']} imóveis");
            $this->info("   • Total: {$result['total']} imóveis");
            
            return 0;
        } else {
            $this->error("❌ Falha no scraping: {$result['error']}");
            return 1;
        }
    }

    private function scrapeUpdatedProperties()
    {
        $limit = (int) $this->option('limit');
        $force = $this->option('force');
        
        $this->info("🔄 Scraping incremental (limite: {$limit})");
        
        // Buscar imóveis que precisam de atualização
        $query = Imovel::query();
        
        if (!$force) {
            $query->where(function ($q) {
                $q->whereNull('scraped_at')
                  ->orWhere('scraped_at', '<', now()->subHours(24));
            });
        }
        
        $properties = $query->limit($limit)->get();
        
        if ($properties->isEmpty()) {
            $this->info('ℹ️  Nenhum imóvel precisa de atualização');
            return 0;
        }
        
        $this->info("📋 Encontrados {$properties->count()} imóveis para processar");
        
        $bar = $this->output->createProgressBar($properties->count());
        $bar->start();
        
        $processed = 0;
        $errors = 0;
        
        foreach ($properties as $property) {
            try {
                // Usar jobs para processamento assíncrono em produção
                if (app()->environment('production')) {
                    ScrapePropertyDetailsJob::dispatch($property->codigo);
                } else {
                    $details = $this->scrapingService->scrapePropertyDetails($property->codigo);
                    if ($details) {
                        $property->update(array_merge($details, [
                            'scraped_at' => now(),
                            'scraping_version' => '1.0'
                        ]));
                        $processed++;
                    }
                }
                
                // Delay para evitar sobrecarga
                usleep(500000); // 0.5 segundos
                
            } catch (\Exception $e) {
                $this->error("\n❌ Erro no imóvel {$property->codigo}: {$e->getMessage()}");
                $errors++;
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        
        $this->newLine(2);
        $this->info("✅ Processamento concluído:");
        $this->info("   • Processados: {$processed}");
        $this->info("   • Erros: {$errors}");
        
        return 0;
    }
}

