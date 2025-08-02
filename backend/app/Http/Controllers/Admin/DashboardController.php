<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Subscription;
use App\Models\Payment;
use App\Models\Imovel;
use App\Models\PropertySearch;
use App\Services\AnalyticsService;
use App\Services\PixelService;
use App\Services\GoogleAdsService;
use Illuminate\Http\Request;
use Carbon\Carbon;
use DB;

class DashboardController extends Controller
{
    protected $analyticsService;
    protected $pixelService;
    protected $googleAdsService;

    public function __construct(
        AnalyticsService $analyticsService,
        PixelService $pixelService,
        GoogleAdsService $googleAdsService
    ) {
        $this->middleware('auth');
        $this->middleware('admin');
        $this->analyticsService = $analyticsService;
        $this->pixelService = $pixelService;
        $this->googleAdsService = $googleAdsService;
    }

    public function index(Request $request)
    {
        $period = $request->get('period', '30'); // dias
        $startDate = now()->subDays($period);
        
        // Métricas principais
        $metrics = $this->getMainMetrics($startDate);
        
        // Dados para gráficos
        $chartData = $this->getChartData($startDate);
        
        // Analytics avançados
        $analytics = $this->getAdvancedAnalytics($startDate);
        
        // Dados de conversão
        $conversionData = $this->getConversionData($startDate);
        
        return view('admin.dashboard', compact(
            'metrics', 
            'chartData', 
            'analytics', 
            'conversionData',
            'period'
        ));
    }

    private function getMainMetrics($startDate)
    {
        return [
            'total_users' => User::count(),
            'new_users' => User::where('created_at', '>=', $startDate)->count(),
            'active_subscriptions' => Subscription::active()->count(),
            'total_revenue' => Payment::where('status', 'completed')
                                   ->where('created_at', '>=', $startDate)
                                   ->sum('amount'),
            'monthly_recurring_revenue' => $this->calculateMRR(),
            'churn_rate' => $this->calculateChurnRate($startDate),
            'avg_revenue_per_user' => $this->calculateARPU(),
            'lifetime_value' => $this->calculateLTV(),
            'total_properties' => Imovel::count(),
            'properties_with_financing' => Imovel::where('aceita_financiamento', true)->count(),
            'total_searches' => PropertySearch::where('created_at', '>=', $startDate)->count(),
            'conversion_rate' => $this->calculateConversionRate($startDate),
        ];
    }

    private function getChartData($startDate)
    {
        // Receita diária
        $dailyRevenue = Payment::where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, SUM(amount) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Novos usuários diários
        $dailyUsers = User::where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Assinaturas por plano
        $subscriptionsByPlan = Subscription::active()
            ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->selectRaw('plans.name, COUNT(*) as count')
            ->groupBy('plans.name')
            ->get();

        // Fontes de tráfego
        $trafficSources = User::where('created_at', '>=', $startDate)
            ->whereNotNull('utm_source')
            ->selectRaw('utm_source, COUNT(*) as count')
            ->groupBy('utm_source')
            ->orderByDesc('count')
            ->get();

        return [
            'daily_revenue' => $dailyRevenue,
            'daily_users' => $dailyUsers,
            'subscriptions_by_plan' => $subscriptionsByPlan,
            'traffic_sources' => $trafficSources,
        ];
    }

    private function getAdvancedAnalytics($startDate)
    {
        return [
            'cohort_analysis' => $this->getCohortAnalysis(),
            'funnel_analysis' => $this->getFunnelAnalysis($startDate),
            'geographic_distribution' => $this->getGeographicDistribution(),
            'device_analytics' => $this->getDeviceAnalytics($startDate),
            'search_patterns' => $this->getSearchPatterns($startDate),
            'property_preferences' => $this->getPropertyPreferences($startDate),
        ];
    }

    private function getConversionData($startDate)
    {
        $funnelSteps = [
            'visitors' => $this->analyticsService->getVisitors($startDate),
            'signups' => User::where('created_at', '>=', $startDate)->count(),
            'trial_starts' => User::where('created_at', '>=', $startDate)
                                 ->whereNotNull('trial_ends_at')->count(),
            'paid_conversions' => Subscription::where('created_at', '>=', $startDate)
                                            ->where('status', 'active')->count(),
        ];

        $conversionRates = [];
        $previous = null;
        foreach ($funnelSteps as $step => $count) {
            if ($previous !== null) {
                $conversionRates[$step] = $previous > 0 ? ($count / $previous) * 100 : 0;
            }
            $previous = $count;
        }

        return [
            'funnel_steps' => $funnelSteps,
            'conversion_rates' => $conversionRates,
        ];
    }

    // Métodos de cálculo de métricas
    private function calculateMRR()
    {
        return Subscription::active()
            ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->sum('plans.price');
    }

    private function calculateChurnRate($startDate)
    {
        $startOfMonth = $startDate->startOfMonth();
        $activeAtStart = Subscription::where('created_at', '<', $startOfMonth)
                                   ->where('status', 'active')->count();
        
        $churned = Subscription::where('cancelled_at', '>=', $startOfMonth)
                              ->where('cancelled_at', '<', now())->count();
        
        return $activeAtStart > 0 ? ($churned / $activeAtStart) * 100 : 0;
    }

    private function calculateARPU()
    {
        $totalRevenue = Payment::where('status', 'completed')
                              ->where('created_at', '>=', now()->subMonth())
                              ->sum('amount');
        
        $activeUsers = Subscription::active()->count();
        
        return $activeUsers > 0 ? $totalRevenue / $activeUsers : 0;
    }

    private function calculateLTV()
    {
        $avgMonthlyRevenue = $this->calculateARPU();
        $avgLifespan = 12; // meses (pode ser calculado dinamicamente)
        
        return $avgMonthlyRevenue * $avgLifespan;
    }

    private function calculateConversionRate($startDate)
    {
        $visitors = $this->analyticsService->getVisitors($startDate);
        $conversions = Subscription::where('created_at', '>=', $startDate)
                                 ->where('status', 'active')->count();
        
        return $visitors > 0 ? ($conversions / $visitors) * 100 : 0;
    }

    // Analytics avançados
    private function getCohortAnalysis()
    {
        // Análise de coorte por mês de registro
        $cohorts = [];
        $months = collect();
        
        for ($i = 11; $i >= 0; $i--) {
            $months->push(now()->subMonths($i)->format('Y-m'));
        }
        
        foreach ($months as $month) {
            $cohortUsers = User::whereRaw("DATE_FORMAT(created_at, '%Y-%m') = ?", [$month])->pluck('id');
            
            if ($cohortUsers->count() > 0) {
                $retention = [];
                for ($period = 0; $period < 12; $period++) {
                    $periodStart = Carbon::createFromFormat('Y-m', $month)->addMonths($period);
                    $periodEnd = $periodStart->copy()->addMonth();
                    
                    $activeInPeriod = Subscription::whereIn('user_id', $cohortUsers)
                        ->where('created_at', '<', $periodEnd)
                        ->where(function ($q) use ($periodEnd) {
                            $q->whereNull('cancelled_at')
                              ->orWhere('cancelled_at', '>=', $periodEnd);
                        })
                        ->count();
                    
                    $retention[$period] = $cohortUsers->count() > 0 ? 
                        ($activeInPeriod / $cohortUsers->count()) * 100 : 0;
                }
                
                $cohorts[$month] = [
                    'size' => $cohortUsers->count(),
                    'retention' => $retention
                ];
            }
        }
        
        return $cohorts;
    }

    private function getFunnelAnalysis($startDate)
    {
        return [
            'landing_page_views' => $this->analyticsService->getPageViews('/', $startDate),
            'signup_page_views' => $this->analyticsService->getPageViews('/register', $startDate),
            'pricing_page_views' => $this->analyticsService->getPageViews('/pricing', $startDate),
            'checkout_starts' => $this->analyticsService->getCheckoutStarts($startDate),
            'payment_attempts' => Payment::where('created_at', '>=', $startDate)->count(),
            'successful_payments' => Payment::where('created_at', '>=', $startDate)
                                           ->where('status', 'completed')->count(),
        ];
    }

    private function getGeographicDistribution()
    {
        return $this->analyticsService->getGeographicData();
    }

    private function getDeviceAnalytics($startDate)
    {
        return $this->analyticsService->getDeviceData($startDate);
    }

    private function getSearchPatterns($startDate)
    {
        return [
            'most_searched_cities' => PropertySearch::where('created_at', '>=', $startDate)
                ->selectRaw('cidade, COUNT(*) as count')
                ->groupBy('cidade')
                ->orderByDesc('count')
                ->limit(10)
                ->get(),
            
            'price_ranges' => PropertySearch::where('created_at', '>=', $startDate)
                ->selectRaw('
                    CASE 
                        WHEN preco_maximo <= 100000 THEN "Até R$ 100k"
                        WHEN preco_maximo <= 300000 THEN "R$ 100k - R$ 300k"
                        WHEN preco_maximo <= 500000 THEN "R$ 300k - R$ 500k"
                        WHEN preco_maximo <= 1000000 THEN "R$ 500k - R$ 1M"
                        ELSE "Acima de R$ 1M"
                    END as range,
                    COUNT(*) as count
                ')
                ->groupBy('range')
                ->get(),
        ];
    }

    private function getPropertyPreferences($startDate)
    {
        return [
            'financing_preference' => PropertySearch::where('created_at', '>=', $startDate)
                ->selectRaw('aceita_financiamento, COUNT(*) as count')
                ->groupBy('aceita_financiamento')
                ->get(),
            
            'property_types' => PropertySearch::where('created_at', '>=', $startDate)
                ->selectRaw('tipo_imovel, COUNT(*) as count')
                ->groupBy('tipo_imovel')
                ->orderByDesc('count')
                ->get(),
        ];
    }

    // Gestão de Pixels e Marketing
    public function pixelManager()
    {
        $pixels = $this->pixelService->getAllPixels();
        $campaigns = $this->googleAdsService->getCampaigns();
        
        return view('admin.pixel-manager', compact('pixels', 'campaigns'));
    }

    public function updatePixel(Request $request)
    {
        $request->validate([
            'type' => 'required|in:facebook,google,tiktok,linkedin',
            'pixel_id' => 'required|string',
            'status' => 'required|boolean',
        ]);

        $this->pixelService->updatePixel(
            $request->type,
            $request->pixel_id,
            $request->status
        );

        return response()->json(['success' => true]);
    }

    // Relatórios avançados
    public function exportReport(Request $request)
    {
        $type = $request->get('type', 'revenue');
        $period = $request->get('period', 30);
        
        return $this->analyticsService->exportReport($type, $period);
    }

    // A/B Testing
    public function abTests()
    {
        $tests = $this->analyticsService->getActiveABTests();
        return view('admin.ab-tests', compact('tests'));
    }
}

