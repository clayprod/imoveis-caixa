"""
Serviço de Cálculo de Financiamento Imobiliário
Baseado na planilha de viabilidade fornecida
"""

import math
from typing import Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class FinancingInputs:
    """Dados de entrada para cálculo de financiamento"""
    # Dados do imóvel
    property_value: float
    declared_value: float
    down_payment: float = 0
    
    # Financiamento
    interest_rate: float = 7.1  # % ao ano
    loan_term: int = 360  # meses
    
    # Custos de aquisição
    documentation_costs: float = 0  # Será calculado como 5%
    auction_commission: float = 5  # %
    
    # Débitos pendentes
    water_bill: float = 0
    electricity_bill: float = 0
    condominium_fees: float = 0
    iptu_arrears: float = 0
    other_debts: float = 0
    
    # Cenário de venda
    sale_price: float = 0
    time_to_sell: int = 22  # meses
    rental_time: int = 18  # meses alugado
    monthly_rent: float = 0
    monthly_iptu: float = 0
    monthly_condominium: float = 0
    maintenance_reforms: float = 0
    broker_commission: float = 6  # %
    
    # IR sobre venda
    is_first_property: bool = True
    will_reinvest: bool = True

@dataclass
class FinancingResults:
    """Resultados do cálculo de financiamento"""
    # Financiamento
    monthly_payment: float
    total_interest: float
    total_financed: float
    
    # Custos
    total_acquisition_costs: float
    monthly_costs: float
    total_cost_until_sale: float
    present_value_costs: float
    
    # Receitas
    total_rental_income: float
    net_sale_value: float
    
    # Impostos
    capital_gains_tax: float
    
    # Resultado
    final_profit: float
    total_return: float  # %
    annual_return: float  # %
    real_return: float  # % (descontando inflação)
    total_investment: float
    
    # Comparações
    comparisons: Dict[str, float]
    
    # Breakdown detalhado
    breakdown: Dict[str, float]
    
    # Timeline
    timeline: Dict[str, Any]

class FinancingCalculatorService:
    """Serviço para cálculo de viabilidade de financiamento imobiliário"""
    
    def __init__(self):
        self.inflation_rate = 4.68  # % ao ano
        self.cdi_rate = 12.5  # % ao ano
        self.savings_rate = 6.2  # % ao ano
        self.stocks_rate = 15.0  # % ao ano (média histórica)
    
    def calculate_financing(self, inputs: FinancingInputs) -> FinancingResults:
        """Calcula a viabilidade do financiamento imobiliário"""
        
        # Calcular custos de documentação (5% do valor)
        if inputs.documentation_costs == 0:
            inputs.documentation_costs = inputs.property_value * 0.05
        
        # Calcular aluguel padrão se não informado (0.6% do valor)
        if inputs.monthly_rent == 0:
            inputs.monthly_rent = inputs.property_value * 0.006
        
        # Calcular preço de venda padrão se não informado (20% de valorização)
        if inputs.sale_price == 0:
            inputs.sale_price = inputs.property_value * 1.2
        
        # 1. Cálculo do financiamento
        principal = inputs.property_value - inputs.down_payment
        monthly_rate = inputs.interest_rate / 100 / 12
        n_payments = inputs.loan_term
        
        # Parcela mensal (Sistema Price)
        if monthly_rate > 0:
            monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** n_payments) / ((1 + monthly_rate) ** n_payments - 1)
        else:
            monthly_payment = principal / n_payments
        
        total_interest = (monthly_payment * n_payments) - principal
        
        # 2. Custos de aquisição
        auction_commission_value = inputs.property_value * inputs.auction_commission / 100
        pending_debts = (inputs.water_bill + inputs.electricity_bill + 
                        inputs.condominium_fees + inputs.iptu_arrears + inputs.other_debts)
        
        total_acquisition_costs = (inputs.property_value + inputs.documentation_costs + 
                                 auction_commission_value + pending_debts)
        
        # 3. Custos mensais
        monthly_costs = monthly_payment + inputs.monthly_iptu + inputs.monthly_condominium
        
        # 4. Receita de aluguel
        total_rental_income = inputs.monthly_rent * inputs.rental_time
        
        # 5. Custos até a venda
        total_monthly_costs = monthly_costs * inputs.time_to_sell
        total_cost_until_sale = total_acquisition_costs + total_monthly_costs + inputs.maintenance_reforms
        
        # 6. Valor presente dos custos
        present_value_costs = self._calculate_present_value(
            total_cost_until_sale, inputs.interest_rate / 100, inputs.time_to_sell / 12
        )
        
        # 7. Receita da venda
        broker_fee = inputs.sale_price * inputs.broker_commission / 100
        
        # 8. Imposto de Renda sobre ganho de capital
        capital_gain = inputs.sale_price - inputs.property_value
        capital_gains_tax = 0
        
        if not inputs.is_first_property or not inputs.will_reinvest:
            if capital_gain > 0:
                capital_gains_tax = capital_gain * 0.15  # 15% sobre o ganho
        
        net_sale_value = inputs.sale_price - broker_fee - capital_gains_tax
        
        # 9. Resultado final
        total_investment = inputs.down_payment + inputs.documentation_costs + auction_commission_value + pending_debts
        final_profit = net_sale_value + total_rental_income - total_cost_until_sale
        
        # 10. Rentabilidade
        if total_investment > 0:
            total_return = (final_profit / total_investment) * 100
            annual_return = (((final_profit + total_investment) / total_investment) ** (12 / inputs.time_to_sell) - 1) * 100
        else:
            total_return = 0
            annual_return = 0
        
        real_return = annual_return - self.inflation_rate
        
        # 11. Comparações
        comparisons = {
            'cdi': self.cdi_rate,
            'savings': self.savings_rate,
            'stocks': self.stocks_rate
        }
        
        # 12. Breakdown detalhado
        breakdown = {
            'property_value': inputs.property_value,
            'documentation_costs': inputs.documentation_costs,
            'auction_commission': auction_commission_value,
            'pending_debts': pending_debts,
            'broker_fee': broker_fee,
            'maintenance_reforms': inputs.maintenance_reforms,
            'total_interest': total_interest
        }
        
        # 13. Timeline
        timeline = self._create_timeline(inputs, monthly_payment, total_rental_income, net_sale_value)
        
        return FinancingResults(
            monthly_payment=monthly_payment,
            total_interest=total_interest,
            total_financed=principal,
            total_acquisition_costs=total_acquisition_costs,
            monthly_costs=monthly_costs,
            total_cost_until_sale=total_cost_until_sale,
            present_value_costs=present_value_costs,
            total_rental_income=total_rental_income,
            net_sale_value=net_sale_value,
            capital_gains_tax=capital_gains_tax,
            final_profit=final_profit,
            total_return=total_return,
            annual_return=annual_return,
            real_return=real_return,
            total_investment=total_investment,
            comparisons=comparisons,
            breakdown=breakdown,
            timeline=timeline
        )
    
    def _calculate_present_value(self, future_value: float, rate: float, years: float) -> float:
        """Calcula o valor presente"""
        if rate > 0:
            return future_value / ((1 + rate) ** years)
        return future_value
    
    def _create_timeline(self, inputs: FinancingInputs, monthly_payment: float, 
                        total_rental_income: float, net_sale_value: float) -> Dict[str, Any]:
        """Cria timeline do investimento"""
        
        timeline = {
            'acquisition': {
                'month': 0,
                'description': 'Aquisição do imóvel',
                'cash_flow': -(inputs.down_payment + inputs.documentation_costs + 
                              inputs.property_value * inputs.auction_commission / 100),
                'accumulated': 0
            },
            'rental_period': {
                'start_month': 1,
                'end_month': inputs.rental_time,
                'monthly_income': inputs.monthly_rent,
                'monthly_costs': monthly_payment + inputs.monthly_iptu + inputs.monthly_condominium,
                'net_monthly': inputs.monthly_rent - (monthly_payment + inputs.monthly_iptu + inputs.monthly_condominium)
            },
            'sale': {
                'month': inputs.time_to_sell,
                'description': 'Venda do imóvel',
                'gross_value': inputs.sale_price,
                'net_value': net_sale_value,
                'final_result': net_sale_value + total_rental_income - inputs.total_investment
            }
        }
        
        return timeline
    
    def calculate_sensitivity_analysis(self, inputs: FinancingInputs) -> Dict[str, Any]:
        """Análise de sensibilidade para diferentes cenários"""
        
        base_result = self.calculate_financing(inputs)
        
        scenarios = {}
        
        # Cenário pessimista (-20% no preço de venda, +50% nos custos)
        pessimistic_inputs = inputs
        pessimistic_inputs.sale_price = inputs.sale_price * 0.8
        pessimistic_inputs.maintenance_reforms = inputs.maintenance_reforms * 1.5
        pessimistic_inputs.rental_time = max(1, inputs.rental_time - 6)  # 6 meses a menos alugado
        scenarios['pessimistic'] = self.calculate_financing(pessimistic_inputs)
        
        # Cenário otimista (+20% no preço de venda, -20% nos custos)
        optimistic_inputs = inputs
        optimistic_inputs.sale_price = inputs.sale_price * 1.2
        optimistic_inputs.maintenance_reforms = inputs.maintenance_reforms * 0.8
        optimistic_inputs.monthly_rent = inputs.monthly_rent * 1.1  # 10% a mais no aluguel
        scenarios['optimistic'] = self.calculate_financing(optimistic_inputs)
        
        # Cenário sem aluguel
        no_rental_inputs = inputs
        no_rental_inputs.monthly_rent = 0
        no_rental_inputs.rental_time = 0
        scenarios['no_rental'] = self.calculate_financing(no_rental_inputs)
        
        return {
            'base': base_result,
            'scenarios': scenarios,
            'risk_analysis': self._analyze_risks(base_result, scenarios)
        }
    
    def _analyze_risks(self, base_result: FinancingResults, scenarios: Dict[str, FinancingResults]) -> Dict[str, Any]:
        """Analisa os riscos do investimento"""
        
        risk_factors = []
        
        # Risco de rentabilidade negativa
        if scenarios['pessimistic'].final_profit < 0:
            risk_factors.append({
                'type': 'high',
                'description': 'Risco de prejuízo em cenário pessimista',
                'impact': abs(scenarios['pessimistic'].final_profit)
            })
        
        # Risco de baixa rentabilidade
        if base_result.annual_return < self.cdi_rate:
            risk_factors.append({
                'type': 'medium',
                'description': 'Rentabilidade inferior ao CDI',
                'impact': self.cdi_rate - base_result.annual_return
            })
        
        # Risco de vacância
        if scenarios['no_rental'].annual_return < base_result.annual_return * 0.5:
            risk_factors.append({
                'type': 'medium',
                'description': 'Alto impacto da vacância na rentabilidade',
                'impact': base_result.annual_return - scenarios['no_rental'].annual_return
            })
        
        # Risco de liquidez
        if base_result.total_investment > 100000:  # Investimento alto
            risk_factors.append({
                'type': 'low',
                'description': 'Investimento de alto valor pode ter menor liquidez',
                'impact': 0
            })
        
        return {
            'risk_factors': risk_factors,
            'risk_score': len([r for r in risk_factors if r['type'] == 'high']) * 3 + 
                         len([r for r in risk_factors if r['type'] == 'medium']) * 2 + 
                         len([r for r in risk_factors if r['type'] == 'low']),
            'recommendations': self._generate_recommendations(risk_factors, base_result)
        }
    
    def _generate_recommendations(self, risk_factors: list, result: FinancingResults) -> list:
        """Gera recomendações baseadas nos riscos identificados"""
        
        recommendations = []
        
        if any(r['type'] == 'high' for r in risk_factors):
            recommendations.append("Considere reduzir o valor da oferta ou buscar outras oportunidades")
            recommendations.append("Tenha uma reserva de emergência de pelo menos 6 meses de custos")
        
        if result.annual_return < 10:
            recommendations.append("Avalie se a rentabilidade justifica o risco e trabalho envolvido")
        
        if result.total_investment > 200000:
            recommendations.append("Considere diversificar em múltiplos imóveis menores")
        
        recommendations.extend([
            "Faça uma vistoria detalhada antes da compra",
            "Obtenha múltiplos orçamentos para reformas",
            "Analise o mercado de locação na região",
            "Considere contratar um seguro para o imóvel",
            "Mantenha documentação completa e organizada"
        ])
        
        return recommendations

# Função utilitária para uso na API
def calculate_property_financing(data: Dict[str, Any]) -> Dict[str, Any]:
    """Função principal para cálculo de financiamento via API"""
    
    try:
        # Converter dados de entrada
        inputs = FinancingInputs(
            property_value=float(data.get('property_value', 0)),
            declared_value=float(data.get('declared_value', 0)),
            down_payment=float(data.get('down_payment', 0)),
            interest_rate=float(data.get('interest_rate', 7.1)),
            loan_term=int(data.get('loan_term', 360)),
            documentation_costs=float(data.get('documentation_costs', 0)),
            auction_commission=float(data.get('auction_commission', 5)),
            water_bill=float(data.get('water_bill', 0)),
            electricity_bill=float(data.get('electricity_bill', 0)),
            condominium_fees=float(data.get('condominium_fees', 0)),
            iptu_arrears=float(data.get('iptu_arrears', 0)),
            other_debts=float(data.get('other_debts', 0)),
            sale_price=float(data.get('sale_price', 0)),
            time_to_sell=int(data.get('time_to_sell', 22)),
            rental_time=int(data.get('rental_time', 18)),
            monthly_rent=float(data.get('monthly_rent', 0)),
            monthly_iptu=float(data.get('monthly_iptu', 0)),
            monthly_condominium=float(data.get('monthly_condominium', 0)),
            maintenance_reforms=float(data.get('maintenance_reforms', 0)),
            broker_commission=float(data.get('broker_commission', 6)),
            is_first_property=bool(data.get('is_first_property', True)),
            will_reinvest=bool(data.get('will_reinvest', True))
        )
        
        # Calcular
        calculator = FinancingCalculatorService()
        result = calculator.calculate_financing(inputs)
        
        # Converter resultado para dicionário
        return {
            'success': True,
            'result': {
                'monthly_payment': result.monthly_payment,
                'total_interest': result.total_interest,
                'total_financed': result.total_financed,
                'total_acquisition_costs': result.total_acquisition_costs,
                'monthly_costs': result.monthly_costs,
                'total_cost_until_sale': result.total_cost_until_sale,
                'present_value_costs': result.present_value_costs,
                'total_rental_income': result.total_rental_income,
                'net_sale_value': result.net_sale_value,
                'capital_gains_tax': result.capital_gains_tax,
                'final_profit': result.final_profit,
                'total_return': result.total_return,
                'annual_return': result.annual_return,
                'real_return': result.real_return,
                'total_investment': result.total_investment,
                'comparisons': result.comparisons,
                'breakdown': result.breakdown,
                'timeline': result.timeline
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'Erro ao calcular financiamento'
        }

