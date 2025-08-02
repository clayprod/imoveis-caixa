<?php

namespace App\Services;

use App\Models\Imovel;
use App\Models\ScrapingLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use DOMDocument;
use DOMXPath;

class IntelligentScrapingService
{
    private $bedrockService;
    private $baseUrl = 'https://venda-imoveis.caixa.gov.br';
    private $maxRetries = 3;
    private $delayBetweenRequests = 2; // segundos
    
    public function __construct(BedrockService $bedrockService)
    {
        $this->bedrockService = $bedrockService;
    }

    /**
     * Executa o scraping completo da lista de imóveis
     */
    public function scrapeAllProperties()
    {
        Log::info('Iniciando scraping completo de imóveis');
        
        try {
            // 1. Baixar lista atualizada de imóveis
            $csvData = $this->downloadPropertyList();
            
            // 2. Processar CSV e identificar novos imóveis
            $properties = $this->processCsvData($csvData);
            
            // 3. Scraping detalhado de cada imóvel
            $scrapedCount = 0;
            $errorCount = 0;
            
            foreach ($properties as $property) {
                try {
                    $detailedData = $this->scrapePropertyDetails($property['codigo']);
                    
                    if ($detailedData) {
                        $this->savePropertyData($property, $detailedData);
                        $scrapedCount++;
                    }
                    
                    // Delay entre requisições para evitar bloqueio
                    sleep($this->delayBetweenRequests);
                    
                } catch (\Exception $e) {
                    Log::error("Erro ao processar imóvel {$property['codigo']}: " . $e->getMessage());
                    $errorCount++;
                }
            }
            
            // Log do resultado
            $this->logScrapingResult($scrapedCount, $errorCount, count($properties));
            
            return [
                'success' => true,
                'scraped' => $scrapedCount,
                'errors' => $errorCount,
                'total' => count($properties)
            ];
            
        } catch (\Exception $e) {
            Log::error('Erro no scraping completo: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Baixa a lista atualizada de imóveis do site da Caixa
     */
    private function downloadPropertyList()
    {
        $url = $this->baseUrl . '/sistema/download-lista.asp';
        
        $response = Http::timeout(30)
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'pt-BR,pt;q=0.9,en;q=0.8',
                'Accept-Encoding' => 'gzip, deflate',
                'Connection' => 'keep-alive',
                'Upgrade-Insecure-Requests' => '1',
            ])
            ->get($url);

        if (!$response->successful()) {
            throw new \Exception('Falha ao baixar lista de imóveis: ' . $response->status());
        }

        return $response->body();
    }

    /**
     * Processa os dados do CSV e identifica imóveis novos ou atualizados
     */
    private function processCsvData($csvData)
    {
        // Converter encoding se necessário
        $csvData = mb_convert_encoding($csvData, 'UTF-8', 'ISO-8859-1');
        
        $lines = explode("\n", $csvData);
        $header = str_getcsv(array_shift($lines), ';');
        
        $properties = [];
        $existingCodes = Imovel::pluck('codigo')->toArray();
        
        foreach ($lines as $line) {
            if (empty(trim($line))) continue;
            
            $data = str_getcsv($line, ';');
            if (count($data) !== count($header)) continue;
            
            $property = array_combine($header, $data);
            
            // Verificar se é um imóvel novo ou se precisa atualização
            if (!in_array($property['Código do imóvel'], $existingCodes) || 
                $this->needsUpdate($property['Código do imóvel'])) {
                
                $properties[] = [
                    'codigo' => $property['Código do imóvel'],
                    'csv_data' => $property
                ];
            }
        }
        
        return $properties;
    }

    /**
     * Faz scraping detalhado de um imóvel específico
     */
    public function scrapePropertyDetails($codigo)
    {
        $url = $this->baseUrl . "/sistema/detalhe-imovel.asp?hdnOrigem=index&hdnimovel={$codigo}";
        
        for ($attempt = 1; $attempt <= $this->maxRetries; $attempt++) {
            try {
                $response = Http::timeout(30)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language' => 'pt-BR,pt;q=0.9,en;q=0.8',
                        'Referer' => $this->baseUrl,
                    ])
                    ->get($url);

                if ($response->successful()) {
                    return $this->extractPropertyData($response->body(), $codigo);
                }
                
            } catch (\Exception $e) {
                Log::warning("Tentativa {$attempt} falhou para imóvel {$codigo}: " . $e->getMessage());
                
                if ($attempt < $this->maxRetries) {
                    sleep($attempt * 2); // Backoff exponencial
                }
            }
        }
        
        throw new \Exception("Falha ao acessar detalhes do imóvel {$codigo} após {$this->maxRetries} tentativas");
    }

    /**
     * Extrai dados da página HTML usando IA para adaptação automática
     */
    private function extractPropertyData($html, $codigo)
    {
        // Primeiro, tentar extração com padrões conhecidos
        $standardData = $this->extractWithStandardPatterns($html);
        
        // Se a extração padrão falhar ou estiver incompleta, usar IA
        if (!$standardData || $this->isDataIncomplete($standardData)) {
            $aiData = $this->extractWithAI($html, $codigo);
            $standardData = array_merge($standardData ?: [], $aiData);
        }
        
        // Validar dados extraídos
        return $this->validateExtractedData($standardData);
    }

    /**
     * Extração usando padrões conhecidos (mais rápido e barato)
     */
    private function extractWithStandardPatterns($html)
    {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        $data = [];
        
        try {
            // Padrões conhecidos para extração
            $patterns = [
                'aceita_financiamento' => [
                    '//text()[contains(., "Financiamento")]/following-sibling::text()[1]',
                    '//td[contains(text(), "Financiamento")]/following-sibling::td[1]',
                    '//span[contains(text(), "Financiamento")]/following-sibling::span[1]',
                    '//div[contains(text(), "Financiamento")]/following-sibling::div[1]',
                ],
                'valor_avaliacao' => [
                    '//text()[contains(., "Avaliação")]/following-sibling::text()[1]',
                    '//td[contains(text(), "Avaliação")]/following-sibling::td[1]',
                ],
                'valor_venda' => [
                    '//text()[contains(., "Venda")]/following-sibling::text()[1]',
                    '//td[contains(text(), "Venda")]/following-sibling::td[1]',
                ],
                'descricao' => [
                    '//div[@class="descricao"]',
                    '//td[contains(@class, "descricao")]',
                ],
                'endereco_completo' => [
                    '//div[contains(@class, "endereco")]',
                    '//td[contains(text(), "Endereço")]/following-sibling::td[1]',
                ],
                'modalidade_venda' => [
                    '//td[contains(text(), "Modalidade")]/following-sibling::td[1]',
                    '//div[contains(text(), "Modalidade")]/following-sibling::div[1]',
                ],
                'situacao_imovel' => [
                    '//td[contains(text(), "Situação")]/following-sibling::td[1]',
                ],
                'ocupacao' => [
                    '//td[contains(text(), "Ocupação")]/following-sibling::td[1]',
                ],
                'matricula' => [
                    '//td[contains(text(), "Matrícula")]/following-sibling::td[1]',
                    '//a[contains(@href, ".pdf")]/@href',
                ],
            ];
            
            foreach ($patterns as $field => $xpaths) {
                foreach ($xpaths as $xpathQuery) {
                    $nodes = $xpath->query($xpathQuery);
                    if ($nodes->length > 0) {
                        $value = trim($nodes->item(0)->textContent ?? $nodes->item(0)->nodeValue);
                        if (!empty($value)) {
                            $data[$field] = $this->cleanExtractedValue($value, $field);
                            break;
                        }
                    }
                }
            }
            
            // Processamento especial para financiamento (campo crítico)
            if (isset($data['aceita_financiamento'])) {
                $data['aceita_financiamento'] = $this->parseFinancingInfo($data['aceita_financiamento']);
            } else {
                // Busca mais agressiva por informações de financiamento
                $data['aceita_financiamento'] = $this->findFinancingInfo($html);
            }
            
        } catch (\Exception $e) {
            Log::error("Erro na extração padrão: " . $e->getMessage());
        }
        
        return $data;
    }

    /**
     * Extração usando IA (Bedrock) quando padrões falham
     */
    private function extractWithAI($html, $codigo)
    {
        // Limpar HTML para reduzir tokens
        $cleanHtml = $this->cleanHtmlForAI($html);
        
        $prompt = $this->buildExtractionPrompt($cleanHtml);
        
        try {
            $response = $this->bedrockService->extractPropertyData($prompt);
            return $this->parseAIResponse($response);
            
        } catch (\Exception $e) {
            Log::error("Erro na extração com IA para imóvel {$codigo}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Busca específica por informações de financiamento
     */
    private function findFinancingInfo($html)
    {
        $financingKeywords = [
            'aceita financiamento',
            'financiamento aceito',
            'financiamento: sim',
            'financiamento: não',
            'financiamento bancário',
            'à vista',
            'somente à vista',
        ];
        
        $html = strtolower($html);
        
        foreach ($financingKeywords as $keyword) {
            if (strpos($html, $keyword) !== false) {
                // Extrair contexto ao redor da palavra-chave
                $context = $this->extractContext($html, $keyword, 100);
                return $this->parseFinancingInfo($context);
            }
        }
        
        return null;
    }

    /**
     * Processa informação de financiamento
     */
    private function parseFinancingInfo($text)
    {
        $text = strtolower(trim($text));
        
        $acceptsFinancing = [
            'sim', 'aceita', 'aceito', 'financiamento aceito', 
            'financiamento: sim', 'permite financiamento'
        ];
        
        $rejectsFinancing = [
            'não', 'nao', 'à vista', 'a vista', 'somente à vista',
            'financiamento: não', 'financiamento: nao', 'não aceita'
        ];
        
        foreach ($acceptsFinancing as $pattern) {
            if (strpos($text, $pattern) !== false) {
                return true;
            }
        }
        
        foreach ($rejectsFinancing as $pattern) {
            if (strpos($text, $pattern) !== false) {
                return false;
            }
        }
        
        return null; // Indeterminado
    }

    /**
     * Constrói prompt para extração com IA
     */
    private function buildExtractionPrompt($html)
    {
        return "
        Analise o HTML abaixo de uma página de detalhes de imóvel da Caixa Econômica Federal e extraia as seguintes informações:

        1. aceita_financiamento (boolean): Se o imóvel aceita financiamento bancário
        2. valor_avaliacao (string): Valor de avaliação do imóvel
        3. valor_venda (string): Valor de venda do imóvel
        4. modalidade_venda (string): Modalidade de venda (leilão, venda direta, etc.)
        5. situacao_imovel (string): Situação do imóvel
        6. ocupacao (string): Se está ocupado ou desocupado
        7. endereco_completo (string): Endereço completo
        8. descricao (string): Descrição do imóvel
        9. matricula (string): Número da matrícula ou link para PDF

        IMPORTANTE: 
        - Para 'aceita_financiamento', procure por termos como 'financiamento', 'à vista', 'aceita financiamento'
        - Se não encontrar uma informação, retorne null
        - Retorne apenas um JSON válido com as informações encontradas

        HTML:
        {$html}
        ";
    }

    /**
     * Limpa HTML para reduzir tokens na IA
     */
    private function cleanHtmlForAI($html)
    {
        // Remove scripts, styles e comentários
        $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);
        $html = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html);
        $html = preg_replace('/<!--.*?-->/is', '', $html);
        
        // Remove tags desnecessárias mas mantém conteúdo
        $html = strip_tags($html, '<table><tr><td><div><span><p><a><strong><b>');
        
        // Remove espaços extras
        $html = preg_replace('/\s+/', ' ', $html);
        
        // Limita tamanho para evitar excesso de tokens
        return substr($html, 0, 8000);
    }

    /**
     * Salva dados do imóvel no banco
     */
    private function savePropertyData($csvProperty, $detailedData)
    {
        $imovel = Imovel::updateOrCreate(
            ['codigo' => $csvProperty['codigo']],
            array_merge($csvProperty['csv_data'], $detailedData, [
                'scraped_at' => now(),
                'scraping_version' => '1.0',
            ])
        );
        
        return $imovel;
    }

    /**
     * Verifica se um imóvel precisa de atualização
     */
    private function needsUpdate($codigo)
    {
        $imovel = Imovel::where('codigo', $codigo)->first();
        
        if (!$imovel) return true;
        
        // Atualizar se não foi feito scraping há mais de 24 horas
        return $imovel->scraped_at < now()->subHours(24);
    }

    /**
     * Verifica se os dados extraídos estão incompletos
     */
    private function isDataIncomplete($data)
    {
        $criticalFields = ['aceita_financiamento', 'valor_venda', 'modalidade_venda'];
        
        foreach ($criticalFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Valida dados extraídos
     */
    private function validateExtractedData($data)
    {
        // Validações específicas
        if (isset($data['valor_venda'])) {
            $data['valor_venda'] = $this->parsePrice($data['valor_venda']);
        }
        
        if (isset($data['valor_avaliacao'])) {
            $data['valor_avaliacao'] = $this->parsePrice($data['valor_avaliacao']);
        }
        
        return $data;
    }

    /**
     * Converte texto de preço para valor numérico
     */
    private function parsePrice($priceText)
    {
        $price = preg_replace('/[^\d,.]/', '', $priceText);
        $price = str_replace(',', '.', $price);
        return floatval($price);
    }

    /**
     * Limpa valores extraídos
     */
    private function cleanExtractedValue($value, $field)
    {
        $value = trim($value);
        $value = preg_replace('/\s+/', ' ', $value);
        
        return $value;
    }

    /**
     * Extrai contexto ao redor de uma palavra-chave
     */
    private function extractContext($text, $keyword, $contextLength = 100)
    {
        $pos = strpos($text, $keyword);
        if ($pos === false) return '';
        
        $start = max(0, $pos - $contextLength);
        $length = $contextLength * 2 + strlen($keyword);
        
        return substr($text, $start, $length);
    }

    /**
     * Processa resposta da IA
     */
    private function parseAIResponse($response)
    {
        try {
            return json_decode($response, true) ?: [];
        } catch (\Exception $e) {
            Log::error("Erro ao processar resposta da IA: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Registra resultado do scraping
     */
    private function logScrapingResult($scraped, $errors, $total)
    {
        ScrapingLog::create([
            'started_at' => now(),
            'completed_at' => now(),
            'total_properties' => $total,
            'scraped_successfully' => $scraped,
            'errors' => $errors,
            'success_rate' => $total > 0 ? ($scraped / $total) * 100 : 0,
        ]);
    }
}

