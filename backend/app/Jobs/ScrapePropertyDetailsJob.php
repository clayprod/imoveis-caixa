<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\IntelligentScrapingService;
use App\Models\Imovel;
use Illuminate\Support\Facades\Log;

class ScrapePropertyDetailsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300; // 5 minutos
    public $tries = 3;
    public $maxExceptions = 3;

    private $propertyCode;
    private $priority;

    public function __construct($propertyCode, $priority = 'normal')
    {
        $this->propertyCode = $propertyCode;
        $this->priority = $priority;
        
        // Definir fila baseada na prioridade
        $this->onQueue($priority === 'high' ? 'high' : 'default');
    }

    public function handle(IntelligentScrapingService $scrapingService)
    {
        Log::info("Iniciando scraping do imóvel: {$this->propertyCode}");
        
        try {
            // Verificar se o imóvel existe no banco
            $imovel = Imovel::where('codigo', $this->propertyCode)->first();
            
            if (!$imovel) {
                Log::warning("Imóvel {$this->propertyCode} não encontrado no banco");
                return;
            }
            
            // Verificar se precisa de atualização
            if ($this->shouldSkipScraping($imovel)) {
                Log::info("Scraping do imóvel {$this->propertyCode} pulado - não necessário");
                return;
            }
            
            // Executar scraping
            $details = $scrapingService->scrapePropertyDetails($this->propertyCode);
            
            if ($details) {
                // Atualizar dados no banco
                $imovel->update(array_merge($details, [
                    'scraped_at' => now(),
                    'scraping_version' => '1.0',
                    'scraping_attempts' => ($imovel->scraping_attempts ?? 0) + 1,
                    'last_scraping_error' => null,
                ]));
                
                Log::info("Scraping do imóvel {$this->propertyCode} concluído com sucesso");
                
                // Disparar eventos para análises adicionais
                $this->dispatchAnalysisJobs($imovel, $details);
                
            } else {
                Log::warning("Nenhum dado extraído para o imóvel {$this->propertyCode}");
                
                $imovel->update([
                    'scraping_attempts' => ($imovel->scraping_attempts ?? 0) + 1,
                    'last_scraping_error' => 'Nenhum dado extraído',
                ]);
            }
            
        } catch (\Exception $e) {
            Log::error("Erro no scraping do imóvel {$this->propertyCode}: {$e->getMessage()}");
            
            // Atualizar contador de tentativas e erro
            if ($imovel ?? null) {
                $imovel->update([
                    'scraping_attempts' => ($imovel->scraping_attempts ?? 0) + 1,
                    'last_scraping_error' => $e->getMessage(),
                ]);
            }
            
            throw $e; // Re-throw para que o job seja reprocessado
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error("Job de scraping falhou definitivamente para imóvel {$this->propertyCode}: {$exception->getMessage()}");
        
        // Marcar imóvel como com erro permanente
        $imovel = Imovel::where('codigo', $this->propertyCode)->first();
        if ($imovel) {
            $imovel->update([
                'scraping_status' => 'failed',
                'last_scraping_error' => $exception->getMessage(),
                'failed_at' => now(),
            ]);
        }
        
        // Notificar administradores sobre falhas críticas
        if ($this->priority === 'high') {
            // Implementar notificação (email, Slack, etc.)
        }
    }

    private function shouldSkipScraping($imovel)
    {
        // Pular se foi feito scraping recentemente
        if ($imovel->scraped_at && $imovel->scraped_at->isAfter(now()->subHours(12))) {
            return true;
        }
        
        // Pular se teve muitas tentativas falhadas recentemente
        if (($imovel->scraping_attempts ?? 0) > 5 && 
            $imovel->updated_at->isAfter(now()->subHours(6))) {
            return true;
        }
        
        return false;
    }

    private function dispatchAnalysisJobs($imovel, $details)
    {
        // Disparar job de análise de investimento se tiver dados suficientes
        if (isset($details['valor_venda']) && isset($details['aceita_financiamento'])) {
            AnalyzeInvestmentOpportunityJob::dispatch($imovel->id)
                ->delay(now()->addMinutes(2));
        }
        
        // Disparar job de geocodificação se tiver endereço
        if (isset($details['endereco_completo'])) {
            GeocodePropertyJob::dispatch($imovel->id)
                ->delay(now()->addMinutes(1));
        }
        
        // Disparar job de análise de mercado
        AnalyzeMarketDataJob::dispatch($imovel->id)
            ->delay(now()->addMinutes(5));
    }

    public function retryUntil()
    {
        return now()->addHours(24);
    }

    public function backoff()
    {
        return [60, 300, 900]; // 1min, 5min, 15min
    }
}

