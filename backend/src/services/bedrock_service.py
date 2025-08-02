import json
import boto3
import logging
from typing import Dict, List, Optional, Any
from botocore.exceptions import ClientError, BotoCoreError

logger = logging.getLogger(__name__)

class BedrockService:
    """
    Serviço para integração com Amazon Bedrock
    Fornece análise de IA para imóveis e oportunidades de investimento
    """
    
    def __init__(self, region_name: str = 'us-east-1'):
        """
        Inicializa o serviço Bedrock
        
        Args:
            region_name: Região AWS para o Bedrock
        """
        try:
            self.bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region_name
            )
            self.model_id = 'anthropic.claude-3-sonnet-20240229-v1:0'
        except Exception as e:
            logger.error(f"Failed to initialize Bedrock client: {e}")
            raise
    
    def analyze_property_opportunity(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analisa uma oportunidade de investimento imobiliário usando IA
        
        Args:
            property_data: Dados do imóvel para análise
            
        Returns:
            Dict com análise detalhada da oportunidade
        """
        prompt = self._build_property_analysis_prompt(property_data)
        
        try:
            response = self._invoke_claude(prompt)
            return self._parse_property_analysis_response(response)
        except Exception as e:
            logger.error(f"Property analysis failed: {e}")
            return self._get_fallback_analysis()
    
    def generate_market_insights(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gera insights de mercado baseados em dados agregados
        
        Args:
            market_data: Dados de mercado para análise
            
        Returns:
            Dict com insights e tendências de mercado
        """
        prompt = self._build_market_insights_prompt(market_data)
        
        try:
            response = self._invoke_claude(prompt)
            return self._parse_market_insights_response(response)
        except Exception as e:
            logger.error(f"Market insights generation failed: {e}")
            return self._get_fallback_market_insights()
    
    def analyze_investment_portfolio(self, portfolio_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analisa um portfólio de investimentos imobiliários
        
        Args:
            portfolio_data: Lista de imóveis no portfólio
            
        Returns:
            Dict com análise do portfólio
        """
        prompt = self._build_portfolio_analysis_prompt(portfolio_data)
        
        try:
            response = self._invoke_claude(prompt)
            return self._parse_portfolio_analysis_response(response)
        except Exception as e:
            logger.error(f"Portfolio analysis failed: {e}")
            return self._get_fallback_portfolio_analysis()
    
    def generate_auction_strategy(self, property_data: Dict[str, Any], user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gera estratégia personalizada para leilão
        
        Args:
            property_data: Dados do imóvel em leilão
            user_profile: Perfil do investidor
            
        Returns:
            Dict com estratégia de leilão personalizada
        """
        prompt = self._build_auction_strategy_prompt(property_data, user_profile)
        
        try:
            response = self._invoke_claude(prompt)
            return self._parse_auction_strategy_response(response)
        except Exception as e:
            logger.error(f"Auction strategy generation failed: {e}")
            return self._get_fallback_auction_strategy()
    
    def _invoke_claude(self, prompt: str, max_tokens: int = 2000) -> str:
        """
        Invoca o modelo Claude via Bedrock
        
        Args:
            prompt: Prompt para o modelo
            max_tokens: Número máximo de tokens na resposta
            
        Returns:
            Resposta do modelo
        """
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.1,
            "top_p": 0.9
        }
        
        try:
            response = self.bedrock_runtime.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType='application/json'
            )
            
            response_body = json.loads(response['body'].read())
            return response_body['content'][0]['text']
            
        except ClientError as e:
            logger.error(f"Bedrock API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Claude: {e}")
            raise
    
    def _build_property_analysis_prompt(self, property_data: Dict[str, Any]) -> str:
        """Constrói prompt para análise de imóvel"""
        return f"""
Você é um especialista em investimentos imobiliários no Brasil. Analise esta oportunidade de investimento em leilão da Caixa Econômica Federal e forneça uma análise detalhada.

DADOS DO IMÓVEL:
- Código: {property_data.get('codigo', 'N/A')}
- Tipo: {property_data.get('tipo_imovel', 'N/A')}
- Endereço: {property_data.get('endereco_completo', 'N/A')}
- Cidade: {property_data.get('cidade', 'N/A')}, {property_data.get('uf', 'N/A')}
- Área Total: {property_data.get('area_total', 'N/A')} m²
- Valor de Avaliação: R$ {property_data.get('valor_avaliacao', 0):,.2f}
- Valor de Venda: R$ {property_data.get('valor_venda', 0):,.2f}
- Desconto: {property_data.get('desconto_percentual', 0):.1f}%
- Aceita Financiamento: {'Sim' if property_data.get('aceita_financiamento') else 'Não'}
- Situação: {property_data.get('situacao_ocupacao', 'N/A')}

ANÁLISE SOLICITADA:
1. Score de Oportunidade (0-100) com justificativa
2. Principais pontos positivos (máximo 5)
3. Principais riscos e pontos de atenção (máximo 5)
4. Estratégia recomendada (locação, revenda, reforma)
5. Faixa de ROI esperado (anual)
6. Perfil de investidor recomendado
7. Dicas específicas para este imóvel

Responda em formato JSON estruturado:
{{
    "score": número,
    "recomendacao": "forte_compra|compra|neutro|cautela|evitar",
    "pontos_positivos": ["ponto1", "ponto2", ...],
    "riscos": ["risco1", "risco2", ...],
    "estrategia_recomendada": "texto",
    "roi_estimado": "X% a Y%",
    "perfil_investidor": "conservador|moderado|agressivo",
    "dicas_especificas": ["dica1", "dica2", ...]
}}
"""
    
    def _build_market_insights_prompt(self, market_data: Dict[str, Any]) -> str:
        """Constrói prompt para insights de mercado"""
        return f"""
Você é um analista de mercado imobiliário brasileiro. Analise os dados agregados e forneça insights sobre tendências e oportunidades.

DADOS DE MERCADO:
- Total de imóveis analisados: {market_data.get('total_properties', 0)}
- Preço médio: R$ {market_data.get('average_price', 0):,.2f}
- Desconto médio: {market_data.get('average_discount', 0):.1f}%
- Cidades principais: {', '.join(market_data.get('top_cities', []))}
- Tipos mais comuns: {', '.join(market_data.get('common_types', []))}
- Período de análise: {market_data.get('period', 'N/A')}

Forneça insights em formato JSON:
{{
    "tendencias_gerais": ["tendência1", "tendência2", ...],
    "oportunidades_destaque": ["oportunidade1", "oportunidade2", ...],
    "alertas_mercado": ["alerta1", "alerta2", ...],
    "recomendacoes_estrategicas": ["rec1", "rec2", ...],
    "previsoes": {{
        "proximo_trimestre": "texto",
        "proximo_ano": "texto"
    }}
}}
"""
    
    def _build_portfolio_analysis_prompt(self, portfolio_data: List[Dict[str, Any]]) -> str:
        """Constrói prompt para análise de portfólio"""
        portfolio_summary = {
            'total_properties': len(portfolio_data),
            'total_value': sum(p.get('valor_venda', 0) for p in portfolio_data),
            'cities': list(set(p.get('cidade', '') for p in portfolio_data)),
            'types': list(set(p.get('tipo_imovel', '') for p in portfolio_data))
        }
        
        return f"""
Analise este portfólio de investimentos imobiliários e forneça recomendações de otimização.

RESUMO DO PORTFÓLIO:
- Número de imóveis: {portfolio_summary['total_properties']}
- Valor total: R$ {portfolio_summary['total_value']:,.2f}
- Cidades: {', '.join(portfolio_summary['cities'])}
- Tipos de imóveis: {', '.join(portfolio_summary['types'])}

Responda em formato JSON:
{{
    "score_diversificacao": número,
    "pontos_fortes": ["ponto1", "ponto2", ...],
    "areas_melhoria": ["area1", "area2", ...],
    "recomendacoes_otimizacao": ["rec1", "rec2", ...],
    "risco_concentracao": "baixo|medio|alto",
    "estrategia_expansao": "texto"
}}
"""
    
    def _build_auction_strategy_prompt(self, property_data: Dict[str, Any], user_profile: Dict[str, Any]) -> str:
        """Constrói prompt para estratégia de leilão"""
        return f"""
Crie uma estratégia personalizada de leilão para este investidor.

DADOS DO IMÓVEL:
- Valor atual: R$ {property_data.get('valor_venda', 0):,.2f}
- Desconto: {property_data.get('desconto_percentual', 0):.1f}%
- Localização: {property_data.get('cidade', 'N/A')}

PERFIL DO INVESTIDOR:
- Experiência: {user_profile.get('experience_level', 'N/A')}
- Capital disponível: R$ {user_profile.get('available_capital', 0):,.2f}
- Objetivo: {user_profile.get('investment_goal', 'N/A')}
- Tolerância a risco: {user_profile.get('risk_tolerance', 'N/A')}

Forneça estratégia em JSON:
{{
    "lance_maximo_recomendado": número,
    "estrategia_lance": "texto",
    "pontos_atencao": ["ponto1", "ponto2", ...],
    "preparacao_necessaria": ["prep1", "prep2", ...],
    "plano_pos_arrematacao": "texto"
}}
"""
    
    def _parse_property_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parseia resposta da análise de imóvel"""
        try:
            # Extrai JSON da resposta
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end != 0:
                json_str = response[start:end]
                return json.loads(json_str)
        except Exception as e:
            logger.error(f"Failed to parse property analysis response: {e}")
        
        return self._get_fallback_analysis()
    
    def _parse_market_insights_response(self, response: str) -> Dict[str, Any]:
        """Parseia resposta dos insights de mercado"""
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end != 0:
                json_str = response[start:end]
                return json.loads(json_str)
        except Exception as e:
            logger.error(f"Failed to parse market insights response: {e}")
        
        return self._get_fallback_market_insights()
    
    def _parse_portfolio_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parseia resposta da análise de portfólio"""
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end != 0:
                json_str = response[start:end]
                return json.loads(json_str)
        except Exception as e:
            logger.error(f"Failed to parse portfolio analysis response: {e}")
        
        return self._get_fallback_portfolio_analysis()
    
    def _parse_auction_strategy_response(self, response: str) -> Dict[str, Any]:
        """Parseia resposta da estratégia de leilão"""
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end != 0:
                json_str = response[start:end]
                return json.loads(json_str)
        except Exception as e:
            logger.error(f"Failed to parse auction strategy response: {e}")
        
        return self._get_fallback_auction_strategy()
    
    def _get_fallback_analysis(self) -> Dict[str, Any]:
        """Retorna análise de fallback quando a IA falha"""
        return {
            "score": 50,
            "recomendacao": "neutro",
            "pontos_positivos": ["Análise detalhada temporariamente indisponível"],
            "riscos": ["Recomenda-se análise manual detalhada"],
            "estrategia_recomendada": "Consulte um especialista para análise completa",
            "roi_estimado": "A definir",
            "perfil_investidor": "moderado",
            "dicas_especificas": ["Realize due diligence completa antes de investir"]
        }
    
    def _get_fallback_market_insights(self) -> Dict[str, Any]:
        """Retorna insights de fallback"""
        return {
            "tendencias_gerais": ["Análise de mercado temporariamente indisponível"],
            "oportunidades_destaque": ["Consulte dados de mercado atualizados"],
            "alertas_mercado": ["Mantenha-se atualizado com indicadores econômicos"],
            "recomendacoes_estrategicas": ["Diversifique investimentos"],
            "previsoes": {
                "proximo_trimestre": "Dados insuficientes para previsão",
                "proximo_ano": "Acompanhe indicadores macroeconômicos"
            }
        }
    
    def _get_fallback_portfolio_analysis(self) -> Dict[str, Any]:
        """Retorna análise de portfólio de fallback"""
        return {
            "score_diversificacao": 50,
            "pontos_fortes": ["Análise detalhada em processamento"],
            "areas_melhoria": ["Consulte especialista para análise completa"],
            "recomendacoes_otimizacao": ["Revise periodicamente seu portfólio"],
            "risco_concentracao": "medio",
            "estrategia_expansao": "Análise personalizada recomendada"
        }
    
    def _get_fallback_auction_strategy(self) -> Dict[str, Any]:
        """Retorna estratégia de leilão de fallback"""
        return {
            "lance_maximo_recomendado": 0,
            "estrategia_lance": "Consulte especialista para estratégia personalizada",
            "pontos_atencao": ["Análise de risco necessária", "Verificar documentação"],
            "preparacao_necessaria": ["Due diligence completa", "Análise financeira"],
            "plano_pos_arrematacao": "Plano personalizado recomendado"
        }

