from flask import Blueprint, request, jsonify
from src.services.bedrock_service import BedrockService
import logging
import traceback

logger = logging.getLogger(__name__)

analysis_bp = Blueprint('analysis', __name__)

# Inicializa serviços
bedrock_service = BedrockService()

@analysis_bp.route('/property-analysis', methods=['POST'])
def analyze_property():
    """
    Analisa uma oportunidade de investimento imobiliário
    
    Body:
    {
        "codigo": "string",
        "tipo_imovel": "string",
        "endereco_completo": "string",
        "cidade": "string",
        "uf": "string",
        "area_total": number,
        "valor_avaliacao": number,
        "valor_venda": number,
        "aceita_financiamento": boolean,
        "situacao_ocupacao": "string"
    }
    """
    try:
        property_data = request.get_json()
        
        if not property_data:
            return jsonify({
                'error': 'Dados do imóvel são obrigatórios'
            }), 400
        
        # Calcula desconto percentual
        if property_data.get('valor_avaliacao', 0) > 0:
            desconto = ((property_data['valor_avaliacao'] - property_data.get('valor_venda', 0)) / 
                       property_data['valor_avaliacao']) * 100
            property_data['desconto_percentual'] = max(0, desconto)
        else:
            property_data['desconto_percentual'] = 0
        
        # Realiza análise com IA
        analysis = bedrock_service.analyze_property_opportunity(property_data)
        
        # Adiciona dados calculados
        analysis['property_data'] = property_data
        analysis['timestamp'] = property_data.get('timestamp')
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Property analysis error: {e}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'message': str(e)
        }), 500

@analysis_bp.route('/market-insights', methods=['POST'])
def get_market_insights():
    """
    Gera insights de mercado baseados em dados agregados
    
    Body:
    {
        "total_properties": number,
        "average_price": number,
        "average_discount": number,
        "top_cities": ["city1", "city2"],
        "common_types": ["type1", "type2"],
        "period": "string"
    }
    """
    try:
        market_data = request.get_json()
        
        if not market_data:
            return jsonify({
                'error': 'Dados de mercado são obrigatórios'
            }), 400
        
        # Gera insights com IA
        insights = bedrock_service.generate_market_insights(market_data)
        
        return jsonify({
            'success': True,
            'insights': insights,
            'market_data': market_data
        })
        
    except Exception as e:
        logger.error(f"Market insights error: {e}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'message': str(e)
        }), 500

@analysis_bp.route('/portfolio-analysis', methods=['POST'])
def analyze_portfolio():
    """
    Analisa um portfólio de investimentos imobiliários
    
    Body:
    {
        "properties": [
            {
                "codigo": "string",
                "tipo_imovel": "string",
                "cidade": "string",
                "uf": "string",
                "valor_venda": number,
                "area_total": number
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('properties'):
            return jsonify({
                'error': 'Lista de imóveis é obrigatória'
            }), 400
        
        portfolio_data = data['properties']
        
        # Analisa portfólio com IA
        analysis = bedrock_service.analyze_investment_portfolio(portfolio_data)
        
        # Adiciona estatísticas básicas
        total_value = sum(p.get('valor_venda', 0) for p in portfolio_data)
        cities = list(set(p.get('cidade', '') for p in portfolio_data if p.get('cidade')))
        types = list(set(p.get('tipo_imovel', '') for p in portfolio_data if p.get('tipo_imovel')))
        
        analysis['portfolio_stats'] = {
            'total_properties': len(portfolio_data),
            'total_value': total_value,
            'average_value': total_value / len(portfolio_data) if portfolio_data else 0,
            'cities_count': len(cities),
            'types_count': len(types),
            'cities': cities,
            'types': types
        }
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Portfolio analysis error: {e}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'message': str(e)
        }), 500

@analysis_bp.route('/auction-strategy', methods=['POST'])
def generate_auction_strategy():
    """
    Gera estratégia personalizada para leilão
    
    Body:
    {
        "property_data": {
            "codigo": "string",
            "valor_venda": number,
            "desconto_percentual": number,
            "cidade": "string"
        },
        "user_profile": {
            "experience_level": "iniciante|intermediario|avancado",
            "available_capital": number,
            "investment_goal": "locacao|revenda|desenvolvimento",
            "risk_tolerance": "conservador|moderado|agressivo"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('property_data') or not data.get('user_profile'):
            return jsonify({
                'error': 'Dados do imóvel e perfil do usuário são obrigatórios'
            }), 400
        
        property_data = data['property_data']
        user_profile = data['user_profile']
        
        # Gera estratégia com IA
        strategy = bedrock_service.generate_auction_strategy(property_data, user_profile)
        
        return jsonify({
            'success': True,
            'strategy': strategy,
            'property_data': property_data,
            'user_profile': user_profile
        })
        
    except Exception as e:
        logger.error(f"Auction strategy error: {e}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'message': str(e)
        }), 500

@analysis_bp.route('/quick-score', methods=['POST'])
def calculate_quick_score():
    """
    Calcula score rápido para um imóvel (sem IA)
    
    Body:
    {
        "valor_avaliacao": number,
        "valor_venda": number,
        "aceita_financiamento": boolean,
        "situacao_ocupacao": "desocupado|ocupado",
        "area_total": number,
        "cidade": "string"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Dados do imóvel são obrigatórios'
            }), 400
        
        score = 0
        factors = []
        
        # Fator desconto (0-40 pontos)
        valor_avaliacao = data.get('valor_avaliacao', 0)
        valor_venda = data.get('valor_venda', 0)
        
        if valor_avaliacao > 0:
            desconto = ((valor_avaliacao - valor_venda) / valor_avaliacao) * 100
            
            if desconto >= 40:
                score += 40
                factors.append(f"Excelente desconto: {desconto:.1f}%")
            elif desconto >= 30:
                score += 35
                factors.append(f"Ótimo desconto: {desconto:.1f}%")
            elif desconto >= 20:
                score += 25
                factors.append(f"Bom desconto: {desconto:.1f}%")
            elif desconto >= 10:
                score += 15
                factors.append(f"Desconto moderado: {desconto:.1f}%")
            else:
                score += 5
                factors.append(f"Desconto baixo: {desconto:.1f}%")
        
        # Fator financiamento (0-20 pontos)
        if data.get('aceita_financiamento'):
            score += 20
            factors.append("Aceita financiamento")
        else:
            factors.append("Apenas à vista")
        
        # Fator ocupação (0-20 pontos)
        if data.get('situacao_ocupacao') == 'desocupado':
            score += 20
            factors.append("Imóvel desocupado")
        else:
            factors.append("Imóvel ocupado - verificar situação")
        
        # Fator área (0-10 pontos)
        area = data.get('area_total', 0)
        if area >= 100:
            score += 10
            factors.append(f"Boa área: {area}m²")
        elif area >= 50:
            score += 7
            factors.append(f"Área adequada: {area}m²")
        elif area > 0:
            score += 3
            factors.append(f"Área compacta: {area}m²")
        
        # Fator localização (0-10 pontos) - simplificado
        cidade = data.get('cidade', '').lower()
        capitais = ['são paulo', 'rio de janeiro', 'belo horizonte', 'brasília', 
                   'salvador', 'fortaleza', 'recife', 'porto alegre', 'curitiba']
        
        if any(cap in cidade for cap in capitais):
            score += 10
            factors.append("Localização em capital")
        else:
            score += 5
            factors.append("Localização interior")
        
        # Classifica o score
        if score >= 80:
            classification = "Excelente oportunidade"
            recommendation = "forte_compra"
        elif score >= 65:
            classification = "Boa oportunidade"
            recommendation = "compra"
        elif score >= 50:
            classification = "Oportunidade regular"
            recommendation = "neutro"
        elif score >= 35:
            classification = "Oportunidade com ressalvas"
            recommendation = "cautela"
        else:
            classification = "Oportunidade de risco"
            recommendation = "evitar"
        
        return jsonify({
            'success': True,
            'quick_analysis': {
                'score': min(100, score),
                'classification': classification,
                'recommendation': recommendation,
                'factors': factors,
                'desconto_percentual': desconto if valor_avaliacao > 0 else 0
            }
        })
        
    except Exception as e:
        logger.error(f"Quick score error: {e}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'message': str(e)
        }), 500

@analysis_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'analysis-api',
        'version': '1.0.0'
    })

# Error handlers
@analysis_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint não encontrado'
    }), 404

@analysis_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'error': 'Método não permitido'
    }), 405

@analysis_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Erro interno do servidor'
    }), 500

