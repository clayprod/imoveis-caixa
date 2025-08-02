#!/usr/bin/env python3
"""
Calculadora de Viabilidade para Investimentos em Leilões da Caixa
Ferramenta para análise financeira completa de oportunidades imobiliárias
"""

import json
import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

class CalculadoraViabilidade:
    """
    Calculadora completa para análise de viabilidade de investimentos
    em imóveis de leilões da Caixa Econômica Federal
    """
    
    def __init__(self):
        self.taxas_padrao = {
            'itbi': 0.02,  # 2% - varia por município
            'cartorio': 0.015,  # 1.5% - custos de cartório e registro
            'leilao': 0.05,  # 5% - taxa do leiloeiro
            'reforma_contingencia': 0.25,  # 25% de margem sobre orçamento
            'vacancia_anual': 0.08,  # 8% de vacância por ano
            'inadimplencia': 0.03,  # 3% de inadimplência
            'administracao': 0.08,  # 8% de taxa de administração
            'manutencao_anual': 0.02,  # 2% do valor do imóvel por ano
            'iptu_anual': 0.01,  # 1% do valor venal por ano
            'seguro_anual': 0.003,  # 0.3% do valor do imóvel por ano
        }
    
    def calcular_investimento_total(self, 
                                  valor_arrematacao: float,
                                  valor_reforma: float = 0,
                                  custos_adicionais: Dict[str, float] = None) -> Dict[str, float]:
        """
        Calcula o investimento total necessário
        
        Args:
            valor_arrematacao: Valor de arrematação do imóvel
            valor_reforma: Valor estimado para reformas
            custos_adicionais: Custos adicionais específicos
            
        Returns:
            Dict com breakdown dos custos
        """
        if custos_adicionais is None:
            custos_adicionais = {}
        
        # Custos obrigatórios
        itbi = valor_arrematacao * self.taxas_padrao['itbi']
        cartorio = valor_arrematacao * self.taxas_padrao['cartorio']
        taxa_leilao = valor_arrematacao * self.taxas_padrao['leilao']
        
        # Reforma com contingência
        reforma_total = valor_reforma * (1 + self.taxas_padrao['reforma_contingencia'])
        
        # Custos adicionais
        outros_custos = sum(custos_adicionais.values())
        
        investimento_total = (valor_arrematacao + itbi + cartorio + 
                            taxa_leilao + reforma_total + outros_custos)
        
        return {
            'valor_arrematacao': valor_arrematacao,
            'itbi': itbi,
            'cartorio': cartorio,
            'taxa_leilao': taxa_leilao,
            'reforma_bruta': valor_reforma,
            'reforma_com_contingencia': reforma_total,
            'outros_custos': outros_custos,
            'investimento_total': investimento_total
        }
    
    def calcular_roi_locacao(self,
                           investimento_total: float,
                           valor_aluguel_mensal: float,
                           prazo_anos: int = 10) -> Dict[str, float]:
        """
        Calcula ROI para estratégia de locação
        
        Args:
            investimento_total: Valor total investido
            valor_aluguel_mensal: Valor mensal de aluguel
            prazo_anos: Prazo de análise em anos
            
        Returns:
            Dict com métricas de rentabilidade
        """
        # Receita bruta anual
        receita_bruta_anual = valor_aluguel_mensal * 12
        
        # Descontos da receita
        vacancia = receita_bruta_anual * self.taxas_padrao['vacancia_anual']
        inadimplencia = receita_bruta_anual * self.taxas_padrao['inadimplencia']
        administracao = receita_bruta_anual * self.taxas_padrao['administracao']
        
        # Receita líquida
        receita_liquida_anual = (receita_bruta_anual - vacancia - 
                               inadimplencia - administracao)
        
        # Custos operacionais anuais
        manutencao = investimento_total * self.taxas_padrao['manutencao_anual']
        iptu = investimento_total * self.taxas_padrao['iptu_anual']
        seguro = investimento_total * self.taxas_padrao['seguro_anual']
        
        custos_operacionais = manutencao + iptu + seguro
        
        # Resultado líquido anual
        resultado_liquido_anual = receita_liquida_anual - custos_operacionais
        
        # Métricas de rentabilidade
        roi_anual = (resultado_liquido_anual / investimento_total) * 100
        payback_anos = investimento_total / resultado_liquido_anual if resultado_liquido_anual > 0 else float('inf')
        
        # Valor acumulado no prazo
        valor_acumulado = resultado_liquido_anual * prazo_anos
        roi_total = (valor_acumulado / investimento_total) * 100
        
        return {
            'receita_bruta_anual': receita_bruta_anual,
            'receita_liquida_anual': receita_liquida_anual,
            'custos_operacionais_anuais': custos_operacionais,
            'resultado_liquido_anual': resultado_liquido_anual,
            'roi_anual_percentual': roi_anual,
            'payback_anos': payback_anos,
            'valor_acumulado_prazo': valor_acumulado,
            'roi_total_prazo': roi_total,
            'breakdown_custos': {
                'vacancia': vacancia,
                'inadimplencia': inadimplencia,
                'administracao': administracao,
                'manutencao': manutencao,
                'iptu': iptu,
                'seguro': seguro
            }
        }
    
    def calcular_roi_revenda(self,
                           investimento_total: float,
                           valor_venda_estimado: float,
                           prazo_meses: int = 12) -> Dict[str, float]:
        """
        Calcula ROI para estratégia de revenda
        
        Args:
            investimento_total: Valor total investido
            valor_venda_estimado: Valor estimado de venda
            prazo_meses: Prazo estimado para venda
            
        Returns:
            Dict com métricas de rentabilidade
        """
        # Custos de venda
        comissao_corretagem = valor_venda_estimado * 0.06  # 6% típico
        itbi_venda = valor_venda_estimado * self.taxas_padrao['itbi']
        custos_marketing = valor_venda_estimado * 0.01  # 1% para marketing
        
        # Impostos sobre ganho de capital (pessoa física)
        ganho_capital = valor_venda_estimado - investimento_total
        imposto_ganho_capital = max(0, ganho_capital * 0.15) if ganho_capital > 0 else 0
        
        # Custos totais de venda
        custos_venda_total = (comissao_corretagem + itbi_venda + 
                            custos_marketing + imposto_ganho_capital)
        
        # Resultado líquido
        valor_liquido_venda = valor_venda_estimado - custos_venda_total
        lucro_liquido = valor_liquido_venda - investimento_total
        
        # Métricas de rentabilidade
        roi_total = (lucro_liquido / investimento_total) * 100
        roi_anual = (roi_total / prazo_meses) * 12
        
        return {
            'valor_venda_estimado': valor_venda_estimado,
            'custos_venda_total': custos_venda_total,
            'valor_liquido_venda': valor_liquido_venda,
            'lucro_liquido': lucro_liquido,
            'roi_total_percentual': roi_total,
            'roi_anual_percentual': roi_anual,
            'prazo_meses': prazo_meses,
            'breakdown_custos_venda': {
                'comissao_corretagem': comissao_corretagem,
                'itbi_venda': itbi_venda,
                'custos_marketing': custos_marketing,
                'imposto_ganho_capital': imposto_ganho_capital
            }
        }
    
    def analise_sensibilidade(self,
                            investimento_total: float,
                            valor_aluguel_base: float,
                            variacao_percentual: float = 20) -> Dict[str, Dict]:
        """
        Análise de sensibilidade variando parâmetros principais
        
        Args:
            investimento_total: Valor total investido
            valor_aluguel_base: Valor base de aluguel
            variacao_percentual: Percentual de variação para teste
            
        Returns:
            Dict com cenários otimista, realista e pessimista
        """
        variacao = variacao_percentual / 100
        
        cenarios = {
            'pessimista': valor_aluguel_base * (1 - variacao),
            'realista': valor_aluguel_base,
            'otimista': valor_aluguel_base * (1 + variacao)
        }
        
        resultados = {}
        for nome, valor_aluguel in cenarios.items():
            roi_data = self.calcular_roi_locacao(investimento_total, valor_aluguel)
            resultados[nome] = {
                'valor_aluguel_mensal': valor_aluguel,
                'roi_anual': roi_data['roi_anual_percentual'],
                'payback_anos': roi_data['payback_anos'],
                'resultado_liquido_anual': roi_data['resultado_liquido_anual']
            }
        
        return resultados
    
    def comparar_estrategias(self,
                           investimento_total: float,
                           valor_aluguel_mensal: float,
                           valor_venda_estimado: float,
                           prazo_venda_meses: int = 12) -> Dict[str, Dict]:
        """
        Compara estratégias de locação vs revenda
        
        Args:
            investimento_total: Valor total investido
            valor_aluguel_mensal: Valor mensal de aluguel
            valor_venda_estimado: Valor estimado de venda
            prazo_venda_meses: Prazo para venda
            
        Returns:
            Dict comparando as duas estratégias
        """
        roi_locacao = self.calcular_roi_locacao(investimento_total, valor_aluguel_mensal)
        roi_revenda = self.calcular_roi_revenda(investimento_total, valor_venda_estimado, prazo_venda_meses)
        
        return {
            'locacao': {
                'roi_anual': roi_locacao['roi_anual_percentual'],
                'payback_anos': roi_locacao['payback_anos'],
                'resultado_anual': roi_locacao['resultado_liquido_anual'],
                'estrategia': 'Renda passiva recorrente'
            },
            'revenda': {
                'roi_anual': roi_revenda['roi_anual_percentual'],
                'payback_anos': prazo_venda_meses / 12,
                'resultado_total': roi_revenda['lucro_liquido'],
                'estrategia': 'Ganho de capital único'
            },
            'recomendacao': 'locacao' if roi_locacao['roi_anual_percentual'] > roi_revenda['roi_anual_percentual'] else 'revenda'
        }
    
    def gerar_relatorio_completo(self,
                               valor_arrematacao: float,
                               valor_reforma: float,
                               valor_aluguel_mensal: float,
                               valor_venda_estimado: float,
                               custos_adicionais: Dict[str, float] = None) -> Dict:
        """
        Gera relatório completo de viabilidade
        
        Args:
            valor_arrematacao: Valor de arrematação
            valor_reforma: Valor de reforma
            valor_aluguel_mensal: Valor mensal de aluguel
            valor_venda_estimado: Valor estimado de venda
            custos_adicionais: Custos adicionais
            
        Returns:
            Dict com análise completa
        """
        # Cálculo do investimento total
        investimento = self.calcular_investimento_total(
            valor_arrematacao, valor_reforma, custos_adicionais
        )
        
        # Análises de ROI
        roi_locacao = self.calcular_roi_locacao(
            investimento['investimento_total'], valor_aluguel_mensal
        )
        
        roi_revenda = self.calcular_roi_revenda(
            investimento['investimento_total'], valor_venda_estimado
        )
        
        # Análise de sensibilidade
        sensibilidade = self.analise_sensibilidade(
            investimento['investimento_total'], valor_aluguel_mensal
        )
        
        # Comparação de estratégias
        comparacao = self.comparar_estrategias(
            investimento['investimento_total'], 
            valor_aluguel_mensal, 
            valor_venda_estimado
        )
        
        return {
            'data_analise': datetime.now().isoformat(),
            'investimento_total': investimento,
            'roi_locacao': roi_locacao,
            'roi_revenda': roi_revenda,
            'analise_sensibilidade': sensibilidade,
            'comparacao_estrategias': comparacao,
            'metricas_resumo': {
                'roi_locacao_anual': roi_locacao['roi_anual_percentual'],
                'roi_revenda_anual': roi_revenda['roi_anual_percentual'],
                'payback_locacao': roi_locacao['payback_anos'],
                'estrategia_recomendada': comparacao['recomendacao']
            }
        }

def exemplo_uso():
    """Exemplo de uso da calculadora"""
    calc = CalculadoraViabilidade()
    
    # Parâmetros do exemplo
    valor_arrematacao = 200000  # R$ 200.000
    valor_reforma = 30000       # R$ 30.000
    valor_aluguel = 1800        # R$ 1.800/mês
    valor_venda = 280000        # R$ 280.000
    
    custos_extras = {
        'documentacao': 2000,
        'mudanca': 1000
    }
    
    # Gerar relatório completo
    relatorio = calc.gerar_relatorio_completo(
        valor_arrematacao,
        valor_reforma,
        valor_aluguel,
        valor_venda,
        custos_extras
    )
    
    # Exibir resultados principais
    print("=== RELATÓRIO DE VIABILIDADE ===")
    print(f"Investimento Total: R$ {relatorio['investimento_total']['investimento_total']:,.2f}")
    print(f"ROI Locação (anual): {relatorio['metricas_resumo']['roi_locacao_anual']:.2f}%")
    print(f"ROI Revenda (anual): {relatorio['metricas_resumo']['roi_revenda_anual']:.2f}%")
    print(f"Payback Locação: {relatorio['metricas_resumo']['payback_locacao']:.1f} anos")
    print(f"Estratégia Recomendada: {relatorio['metricas_resumo']['estrategia_recomendada'].title()}")
    
    return relatorio

if __name__ == "__main__":
    exemplo_uso()

