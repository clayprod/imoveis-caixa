import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import PropertyFinancingSimulator from '../components/PropertyFinancingSimulator';
import { 
  MapPin, 
  Home, 
  Ruler, 
  DollarSign, 
  Calendar, 
  FileText, 
  Heart, 
  Share2, 
  Calculator,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Star,
  Bed,
  Bath,
  Car,
  Building
} from 'lucide-react';

const PropertyDetails = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Simular carregamento de dados do imóvel
    setTimeout(() => {
      setProperty({
        id: id,
        codigo: '1444419970935',
        tipo_imovel: 'Apartamento',
        endereco_completo: 'Rua Porangatu, 33 - Jardim Dall\'Orto, Sumaré, SP, 13175-000',
        cidade: 'Sumaré',
        uf: 'SP',
        bairro: 'Jardim Dall\'Orto',
        cep: '13175-000',
        area_total: 65.5,
        quartos: 2,
        banheiros: 1,
        vagas: 1,
        valor_avaliacao: 250000,
        valor_venda: 191280,
        desconto_percentual: 23.5,
        aceita_financiamento: true,
        situacao_ocupacao: 'desocupado',
        modalidade_venda: 'Venda Direta Online',
        data_disponibilizacao: '2024-01-15',
        matricula: '12345',
        cartorio: '1º Cartório de Registro de Imóveis de Sumaré',
        ai_score: 85,
        ai_analysis: {
          score: 85,
          recomendacao: 'compra',
          pontos_positivos: [
            'Excelente desconto de 23.5%',
            'Aceita financiamento habitacional',
            'Imóvel desocupado - entrega imediata',
            'Boa localização em Sumaré',
            'Área adequada para família pequena',
            'Região com boa infraestrutura'
          ],
          riscos: [
            'Necessidade de vistoria prévia',
            'Possíveis custos de reforma',
            'Verificar débitos condominiais'
          ],
          estrategia_recomendada: 'Locação após pequenos reparos',
          roi_estimado: '8% a 12% ao ano',
          perfil_investidor: 'moderado',
          dicas_especificas: [
            'Visite o imóvel antes da compra',
            'Verifique a documentação completa',
            'Orce possíveis reformas necessárias',
            'Analise o mercado de locação na região'
          ]
        },
        location_analysis: {
          score: 78,
          classification: 'Boa',
          nearby_amenities: [
            'Escola Municipal a 300m',
            'Posto de Saúde a 500m',
            'Supermercado a 200m',
            'Ponto de ônibus a 100m',
            'Farmácia a 150m'
          ],
          transport_score: 85,
          safety_score: 72,
          infrastructure_score: 80
        },
        images: [
          'https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=Fachada',
          'https://via.placeholder.com/800x600/059669/FFFFFF?text=Sala',
          'https://via.placeholder.com/800x600/DC2626/FFFFFF?text=Cozinha',
          'https://via.placeholder.com/800x600/7C3AED/FFFFFF?text=Quarto'
        ],
        documents: [
          {
            name: 'Matrícula do Imóvel',
            url: '/documents/matricula.pdf',
            size: '2.5 MB'
          },
          {
            name: 'Edital de Venda',
            url: '/documents/edital.pdf',
            size: '1.8 MB'
          }
        ]
      });
      setLoading(false);
    }, 1000);
  }, [id]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRecommendationIcon = (recomendacao) => {
    switch (recomendacao) {
      case 'compra':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cautela':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'evitar':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Imóvel não encontrado</h1>
          <p className="text-gray-600">O imóvel solicitado não foi encontrado ou não está mais disponível.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {property.tipo_imovel} - {property.cidade}, {property.uf}
            </h1>
            <div className="flex items-center text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{property.endereco_completo}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Código: {property.codigo}</Badge>
              <Badge variant={property.aceita_financiamento ? "default" : "secondary"}>
                {property.aceita_financiamento ? "Aceita Financiamento" : "À Vista"}
              </Badge>
              <Badge variant={property.situacao_ocupacao === 'desocupado' ? "default" : "destructive"}>
                {property.situacao_ocupacao === 'desocupado' ? "Desocupado" : "Ocupado"}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 lg:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFavorite(!isFavorite)}
              className={isFavorite ? "text-red-600 border-red-600" : ""}
            >
              <Heart className={`h-4 w-4 mr-1 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Favoritado" : "Favoritar"}
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Compartilhar
            </Button>
          </div>
        </div>

        {/* Preços e Score */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Valor de Venda</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(property.valor_venda)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Valor de Avaliação</div>
              <div className="text-xl font-semibold text-gray-900">{formatCurrency(property.valor_avaliacao)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Desconto</div>
              <div className="text-2xl font-bold text-blue-600">{property.desconto_percentual.toFixed(1)}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Score IA</div>
              <div className="flex items-center">
                <div className={`text-2xl font-bold px-2 py-1 rounded ${getScoreColor(property.ai_score)}`}>
                  {property.ai_score}
                </div>
                <div className="ml-2">
                  {getRecommendationIcon(property.ai_analysis.recomendacao)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analysis">Análise IA</TabsTrigger>
          <TabsTrigger value="location">Localização</TabsTrigger>
          <TabsTrigger value="simulator">Simulador</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Imagens */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Fotos do Imóvel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {property.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Imóvel ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Características */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Características</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Ruler className="h-4 w-4 mr-2 text-gray-600" />
                      <span>Área Total</span>
                    </div>
                    <span className="font-semibold">{property.area_total}m²</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bed className="h-4 w-4 mr-2 text-gray-600" />
                      <span>Quartos</span>
                    </div>
                    <span className="font-semibold">{property.quartos}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bath className="h-4 w-4 mr-2 text-gray-600" />
                      <span>Banheiros</span>
                    </div>
                    <span className="font-semibold">{property.banheiros}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Car className="h-4 w-4 mr-2 text-gray-600" />
                      <span>Vagas</span>
                    </div>
                    <span className="font-semibold">{property.vagas}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-600" />
                      <span>Modalidade</span>
                    </div>
                    <span className="font-semibold text-sm">{property.modalidade_venda}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                      <span>Disponível desde</span>
                    </div>
                    <span className="font-semibold text-sm">
                      {new Date(property.data_disponibilizacao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informações Legais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Matrícula</div>
                    <div className="font-semibold">{property.matricula}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Cartório</div>
                    <div className="font-semibold text-sm">{property.cartorio}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">CEP</div>
                    <div className="font-semibold">{property.cep}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Análise com IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Score Geral</span>
                  <div className={`px-3 py-1 rounded-full font-bold ${getScoreColor(property.ai_analysis.score)}`}>
                    {property.ai_analysis.score}/100
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Recomendação</span>
                  <div className="flex items-center">
                    {getRecommendationIcon(property.ai_analysis.recomendacao)}
                    <span className="ml-2 font-semibold capitalize">
                      {property.ai_analysis.recomendacao}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>ROI Estimado</span>
                  <span className="font-semibold text-green-600">{property.ai_analysis.roi_estimado}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Perfil Recomendado</span>
                  <Badge variant="outline" className="capitalize">
                    {property.ai_analysis.perfil_investidor}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Estratégia</span>
                  <span className="font-semibold text-sm">{property.ai_analysis.estrategia_recomendada}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Pontos Positivos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {property.ai_analysis.pontos_positivos.map((ponto, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{ponto}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-600">Riscos e Atenções</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {property.ai_analysis.riscos.map((risco, index) => (
                    <li key={index} className="flex items-start">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{risco}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Dicas Específicas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {property.ai_analysis.dicas_especificas.map((dica, index) => (
                    <li key={index} className="flex items-start">
                      <Star className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{dica}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Análise de Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Score Geral</span>
                  <div className={`px-3 py-1 rounded-full font-bold ${getScoreColor(property.location_analysis.score)}`}>
                    {property.location_analysis.score}/100
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Classificação</span>
                  <Badge variant="outline">{property.location_analysis.classification}</Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Transporte</span>
                    <div className={`px-2 py-1 rounded text-sm font-semibold ${getScoreColor(property.location_analysis.transport_score)}`}>
                      {property.location_analysis.transport_score}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Segurança</span>
                    <div className={`px-2 py-1 rounded text-sm font-semibold ${getScoreColor(property.location_analysis.safety_score)}`}>
                      {property.location_analysis.safety_score}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Infraestrutura</span>
                    <div className={`px-2 py-1 rounded text-sm font-semibold ${getScoreColor(property.location_analysis.infrastructure_score)}`}>
                      {property.location_analysis.infrastructure_score}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Comodidades Próximas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {property.location_analysis.nearby_amenities.map((amenity, index) => (
                    <li key={index} className="flex items-start">
                      <MapPin className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{amenity}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            {/* Mapa placeholder */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Localização no Mapa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2" />
                    <p>Mapa interativo será carregado aqui</p>
                    <p className="text-sm">{property.endereco_completo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simulator">
          <PropertyFinancingSimulator property={property} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {property.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <div className="font-semibold">{doc.name}</div>
                        <div className="text-sm text-gray-600">{doc.size}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Informações Importantes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Verifique todos os documentos antes de fazer uma oferta</span>
                </div>
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Consulte um advogado especializado em direito imobiliário</span>
                </div>
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Visite o imóvel pessoalmente antes da compra</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PropertyDetails;

