<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GoogleMapsService
{
    private $apiKey;
    private $baseUrl = 'https://maps.googleapis.com/maps/api';
    
    public function __construct()
    {
        $this->apiKey = config('services.google_maps.api_key');
    }
    
    /**
     * Geocodifica um endereço para obter coordenadas
     */
    public function geocodeAddress(string $address): ?array
    {
        $cacheKey = 'geocode_' . md5($address);
        
        return Cache::remember($cacheKey, now()->addDays(30), function () use ($address) {
            try {
                $response = Http::get($this->baseUrl . '/geocode/json', [
                    'address' => $address,
                    'key' => $this->apiKey,
                    'region' => 'BR',
                    'language' => 'pt-BR'
                ]);
                
                if ($response->successful()) {
                    $data = $response->json();
                    
                    if ($data['status'] === 'OK' && !empty($data['results'])) {
                        $result = $data['results'][0];
                        
                        return [
                            'latitude' => $result['geometry']['location']['lat'],
                            'longitude' => $result['geometry']['location']['lng'],
                            'formatted_address' => $result['formatted_address'],
                            'address_components' => $this->parseAddressComponents($result['address_components']),
                            'place_id' => $result['place_id'] ?? null,
                            'types' => $result['types'] ?? []
                        ];
                    }
                }
                
                Log::warning('Geocoding failed', [
                    'address' => $address,
                    'response' => $response->json()
                ]);
                
                return null;
                
            } catch (\Exception $e) {
                Log::error('Geocoding error', [
                    'address' => $address,
                    'error' => $e->getMessage()
                ]);
                
                return null;
            }
        });
    }
    
    /**
     * Geocodificação reversa - coordenadas para endereço
     */
    public function reverseGeocode(float $latitude, float $longitude): ?array
    {
        $cacheKey = 'reverse_geocode_' . md5("{$latitude},{$longitude}");
        
        return Cache::remember($cacheKey, now()->addDays(30), function () use ($latitude, $longitude) {
            try {
                $response = Http::get($this->baseUrl . '/geocode/json', [
                    'latlng' => "{$latitude},{$longitude}",
                    'key' => $this->apiKey,
                    'language' => 'pt-BR'
                ]);
                
                if ($response->successful()) {
                    $data = $response->json();
                    
                    if ($data['status'] === 'OK' && !empty($data['results'])) {
                        $result = $data['results'][0];
                        
                        return [
                            'formatted_address' => $result['formatted_address'],
                            'address_components' => $this->parseAddressComponents($result['address_components']),
                            'place_id' => $result['place_id'] ?? null
                        ];
                    }
                }
                
                return null;
                
            } catch (\Exception $e) {
                Log::error('Reverse geocoding error', [
                    'coordinates' => "{$latitude},{$longitude}",
                    'error' => $e->getMessage()
                ]);
                
                return null;
            }
        });
    }
    
    /**
     * Busca lugares próximos (POIs)
     */
    public function findNearbyPlaces(float $latitude, float $longitude, string $type = 'point_of_interest', int $radius = 1000): array
    {
        $cacheKey = 'nearby_places_' . md5("{$latitude},{$longitude},{$type},{$radius}");
        
        return Cache::remember($cacheKey, now()->addHours(6), function () use ($latitude, $longitude, $type, $radius) {
            try {
                $response = Http::get($this->baseUrl . '/place/nearbysearch/json', [
                    'location' => "{$latitude},{$longitude}",
                    'radius' => $radius,
                    'type' => $type,
                    'key' => $this->apiKey,
                    'language' => 'pt-BR'
                ]);
                
                if ($response->successful()) {
                    $data = $response->json();
                    
                    if ($data['status'] === 'OK') {
                        return array_map(function ($place) {
                            return [
                                'name' => $place['name'],
                                'place_id' => $place['place_id'],
                                'types' => $place['types'],
                                'rating' => $place['rating'] ?? null,
                                'user_ratings_total' => $place['user_ratings_total'] ?? 0,
                                'vicinity' => $place['vicinity'] ?? null,
                                'geometry' => $place['geometry'],
                                'price_level' => $place['price_level'] ?? null
                            ];
                        }, $data['results']);
                    }
                }
                
                return [];
                
            } catch (\Exception $e) {
                Log::error('Nearby places search error', [
                    'coordinates' => "{$latitude},{$longitude}",
                    'type' => $type,
                    'error' => $e->getMessage()
                ]);
                
                return [];
            }
        });
    }
    
    /**
     * Calcula distância e tempo entre dois pontos
     */
    public function getDistanceMatrix(array $origins, array $destinations, string $mode = 'driving'): ?array
    {
        try {
            $response = Http::get($this->baseUrl . '/distancematrix/json', [
                'origins' => implode('|', $origins),
                'destinations' => implode('|', $destinations),
                'mode' => $mode,
                'units' => 'metric',
                'key' => $this->apiKey,
                'language' => 'pt-BR'
            ]);
            
            if ($response->successful()) {
                $data = $response->json();
                
                if ($data['status'] === 'OK') {
                    return $data;
                }
            }
            
            return null;
            
        } catch (\Exception $e) {
            Log::error('Distance matrix error', [
                'origins' => $origins,
                'destinations' => $destinations,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }
    
    /**
     * Analisa qualidade da localização baseada em POIs próximos
     */
    public function analyzeLocationQuality(float $latitude, float $longitude): array
    {
        $analysis = [
            'score' => 0,
            'factors' => [],
            'nearby_amenities' => []
        ];
        
        // Tipos de POIs importantes para análise imobiliária
        $importantTypes = [
            'school' => ['weight' => 20, 'label' => 'Escolas'],
            'hospital' => ['weight' => 15, 'label' => 'Hospitais'],
            'subway_station' => ['weight' => 25, 'label' => 'Estações de Metrô'],
            'bus_station' => ['weight' => 15, 'label' => 'Estações de Ônibus'],
            'shopping_mall' => ['weight' => 10, 'label' => 'Shopping Centers'],
            'supermarket' => ['weight' => 10, 'label' => 'Supermercados'],
            'bank' => ['weight' => 5, 'label' => 'Bancos']
        ];
        
        foreach ($importantTypes as $type => $config) {
            $places = $this->findNearbyPlaces($latitude, $longitude, $type, 2000);
            
            if (!empty($places)) {
                $count = count($places);
                $avgRating = collect($places)->avg('rating') ?: 3.0;
                
                // Calcula pontuação baseada na quantidade e qualidade
                $typeScore = min($config['weight'], ($count * 2) + ($avgRating - 3) * 5);
                $analysis['score'] += $typeScore;
                
                $analysis['factors'][] = [
                    'type' => $type,
                    'label' => $config['label'],
                    'count' => $count,
                    'avg_rating' => round($avgRating, 1),
                    'score' => round($typeScore, 1),
                    'weight' => $config['weight']
                ];
                
                $analysis['nearby_amenities'] = array_merge(
                    $analysis['nearby_amenities'],
                    array_slice($places, 0, 3) // Top 3 de cada tipo
                );
            }
        }
        
        // Normaliza score para 0-100
        $analysis['score'] = min(100, round($analysis['score']));
        
        // Classifica a localização
        if ($analysis['score'] >= 80) {
            $analysis['classification'] = 'Excelente';
        } elseif ($analysis['score'] >= 60) {
            $analysis['classification'] = 'Boa';
        } elseif ($analysis['score'] >= 40) {
            $analysis['classification'] = 'Regular';
        } else {
            $analysis['classification'] = 'Ruim';
        }
        
        return $analysis;
    }
    
    /**
     * Parseia componentes do endereço
     */
    private function parseAddressComponents(array $components): array
    {
        $parsed = [
            'street_number' => null,
            'route' => null,
            'neighborhood' => null,
            'city' => null,
            'state' => null,
            'postal_code' => null,
            'country' => null
        ];
        
        foreach ($components as $component) {
            $types = $component['types'];
            
            if (in_array('street_number', $types)) {
                $parsed['street_number'] = $component['long_name'];
            } elseif (in_array('route', $types)) {
                $parsed['route'] = $component['long_name'];
            } elseif (in_array('sublocality', $types) || in_array('neighborhood', $types)) {
                $parsed['neighborhood'] = $component['long_name'];
            } elseif (in_array('administrative_area_level_2', $types)) {
                $parsed['city'] = $component['long_name'];
            } elseif (in_array('administrative_area_level_1', $types)) {
                $parsed['state'] = $component['short_name'];
            } elseif (in_array('postal_code', $types)) {
                $parsed['postal_code'] = $component['long_name'];
            } elseif (in_array('country', $types)) {
                $parsed['country'] = $component['long_name'];
            }
        }
        
        return $parsed;
    }
    
    /**
     * Gera URL para Street View
     */
    public function getStreetViewUrl(float $latitude, float $longitude, int $width = 640, int $height = 640): string
    {
        return $this->baseUrl . '/streetview?' . http_build_query([
            'location' => "{$latitude},{$longitude}",
            'size' => "{$width}x{$height}",
            'key' => $this->apiKey,
            'fov' => 90,
            'heading' => 0,
            'pitch' => 0
        ]);
    }
}

