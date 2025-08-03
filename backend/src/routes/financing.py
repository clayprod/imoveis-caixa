"""
Rotas da API para Simulador de Financiamento Imobiliário
"""

from flask import Blueprint, request, jsonify
from services.financing_calculator import calculate_property_financing, FinancingCalculatorService
import logging

# Module logger
logger = logging.getLogger(__name__)

financing_bp = Blueprint('financing', __name__)

@financing_bp.route('/calculate', methods=['POST'])
def calculate_financing():
    """
    Calcula a viabilidade de financiamento imobiliário
    
    Exemplo de payload:
    {
        "property_value": 191280,
        "declared_value": 191280,
        "down_payment": 10080,
        "interest_rate": 7.1,
        "loan_term": 360,
        "auction_commission": 5,
        "water_bill": 0,
        "electricity_bill": 0,
        "condominium_fees": 0,
        "iptu_arrears": 891,
        "other_debts": 0,
        "sale_price": 290000,
        "time_to_sell": 22,
        "rental_time": 18,
        "monthly_rent": 1800,
        "monthly_iptu": 94.25,
        "monthly_condominium": 0,
        "maintenance_reforms": 5930.33,
        "broker_commission": 6,
        "is_first_property": true,
        "will_reinvest": true
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos',
                'message': 'É necessário enviar os dados do financiamento'
            }), 400
        
        # Validar campos obrigatórios
        required_fields = ['property_value']
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': 'Campos obrigatórios ausentes',
                'missing_fields': missing_fields
            }), 400
        
        # Calcular financiamento
        result = calculate_property_financing(data)
        
        if result['success']:
            logger.info(f"Cálculo de financiamento realizado com sucesso para imóvel de R$ {data['property_value']}")
            return jsonify(result), 200
        else:
            logger.error(f"Erro no cálculo de financiamento: {result.get('error', 'Erro desconhecido')}")
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Erro inesperado no cálculo de financiamento: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor',
            'message': 'Ocorreu um erro inesperado ao calcular o financiamento'
        }), 500

@financing_bp.route('/sensitivity-analysis', methods=['POST'])
def sensitivity_analysis():
    """
    Realiza análise de sensibilidade para diferentes cenários
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        # Validar campos obrigatórios
        if 'property_value' not in data:
            return jsonify({
                'success': False,
                'error': 'Valor do imóvel é obrigatório'
            }), 400
        
        # Criar instância do calculador
        calculator = FinancingCalculatorService()
        
        # Converter dados para inputs
        from services.financing_calculator import FinancingInputs
        
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
        
        # Calcular análise de sensibilidade
        analysis = calculator.calculate_sensitivity_analysis(inputs)
        
        # Converter resultados para formato JSON serializável
        def convert_result_to_dict(result):
            return {
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
        
        response = {
            'success': True,
            'analysis': {
                'base': convert_result_to_dict(analysis['base']),
                'scenarios': {
                    'pessimistic': convert_result_to_dict(analysis['scenarios']['pessimistic']),
                    'optimistic': convert_result_to_dict(analysis['scenarios']['optimistic']),
                    'no_rental': convert_result_to_dict(analysis['scenarios']['no_rental'])
                },
                'risk_analysis': analysis['risk_analysis']
            }
        }
        
        logger.info(f"Análise de sensibilidade realizada com sucesso para imóvel de R$ {data['property_value']}")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Erro na análise de sensibilidade: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor',
            'message': 'Ocorreu um erro inesperado na análise de sensibilidade'
        }), 500

@financing_bp.route('/quick-estimate', methods=['POST'])
def quick_estimate():
    """
    Estimativa rápida de financiamento com dados básicos
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        property_value = float(data.get('property_value', 0))
        down_payment = float(data.get('down_payment', 0))
        interest_rate = float(data.get('interest_rate', 7.1))
        loan_term = int(data.get('loan_term', 360))
        
        if property_value <= 0:
            return jsonify({
                'success': False,
                'error': 'Valor do imóvel deve ser maior que zero'
            }), 400
        
        # Cálculo rápido
        principal = property_value - down_payment
        monthly_rate = interest_rate / 100 / 12
        n_payments = loan_term
        
        if monthly_rate > 0:
            monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** n_payments) / ((1 + monthly_rate) ** n_payments - 1)
        else:
            monthly_payment = principal / n_payments
        
        total_interest = (monthly_payment * n_payments) - principal
        total_amount = principal + total_interest
        
        # Custos estimados
        documentation_costs = property_value * 0.05  # 5%
        total_initial_cost = down_payment + documentation_costs
        
        # Estimativa de aluguel (0.6% do valor)
        estimated_rent = property_value * 0.006
        
        # Yield estimado
        annual_rent = estimated_rent * 12
        gross_yield = (annual_rent / property_value) * 100
        
        response = {
            'success': True,
            'quick_estimate': {
                'monthly_payment': round(monthly_payment, 2),
                'total_interest': round(total_interest, 2),
                'total_amount': round(total_amount, 2),
                'documentation_costs': round(documentation_costs, 2),
                'total_initial_cost': round(total_initial_cost, 2),
                'estimated_monthly_rent': round(estimated_rent, 2),
                'estimated_annual_rent': round(annual_rent, 2),
                'gross_yield': round(gross_yield, 2),
                'financing_details': {
                    'principal': round(principal, 2),
                    'interest_rate': interest_rate,
                    'loan_term_years': loan_term / 12,
                    'loan_term_months': loan_term
                }
            }
        }
        
        logger.info(f"Estimativa rápida calculada para imóvel de R$ {property_value}")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Erro na estimativa rápida: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor',
            'message': 'Ocorreu um erro inesperado na estimativa rápida'
        }), 500

@financing_bp.route('/market-rates', methods=['GET'])
def get_market_rates():
    """
    Retorna taxas de mercado atualizadas para comparação
    """
    try:
        # Em produção, essas taxas viriam de APIs externas ou banco de dados
        market_rates = {
            'financing': {
                'caixa_sac': 7.1,  # % ao ano
                'caixa_price': 7.3,  # % ao ano
                'banco_brasil': 7.5,  # % ao ano
                'itau': 8.2,  # % ao ano
                'bradesco': 8.0,  # % ao ano
                'santander': 8.1  # % ao ano
            },
            'investments': {
                'cdi': 12.5,  # % ao ano
                'selic': 11.75,  # % ao ano
                'savings': 6.2,  # % ao ano
                'cdb': 12.8,  # % ao ano
                'lci_lca': 10.5,  # % ao ano
                'stocks_ibovespa': 15.0  # % ao ano (média histórica)
            },
            'real_estate': {
                'average_yield': 6.5,  # % ao ano
                'appreciation_rate': 5.2,  # % ao ano
                'vacancy_rate': 8.5,  # %
                'management_fee': 8.0  # % sobre aluguel
            },
            'economic_indicators': {
                'inflation_ipca': 4.68,  # % ao ano
                'inflation_igpm': 5.12,  # % ao ano
                'dollar_rate': 5.15,  # BRL/USD
                'unemployment_rate': 8.2  # %
            },
            'last_updated': '2024-01-15T10:00:00Z'
        }
        
        return jsonify({
            'success': True,
            'market_rates': market_rates
        }), 200
        
    except Exception as e:
        logger.error(f"Erro ao obter taxas de mercado: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor',
            'message': 'Ocorreu um erro ao obter as taxas de mercado'
        }), 500

@financing_bp.route('/amortization-table', methods=['POST'])
def generate_amortization_table():
    """
    Gera tabela de amortização do financiamento
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        property_value = float(data.get('property_value', 0))
        down_payment = float(data.get('down_payment', 0))
        interest_rate = float(data.get('interest_rate', 7.1))
        loan_term = int(data.get('loan_term', 360))
        system = data.get('system', 'price').lower()  # 'price' ou 'sac'
        
        if property_value <= 0:
            return jsonify({
                'success': False,
                'error': 'Valor do imóvel deve ser maior que zero'
            }), 400
        
        principal = property_value - down_payment
        monthly_rate = interest_rate / 100 / 12
        
        amortization_table = []
        balance = principal
        
        if system == 'sac':
            # Sistema SAC (Amortização Constante)
            monthly_amortization = principal / loan_term
            
            for month in range(1, loan_term + 1):
                interest_payment = balance * monthly_rate
                monthly_payment = monthly_amortization + interest_payment
                balance -= monthly_amortization
                
                amortization_table.append({
                    'month': month,
                    'monthly_payment': round(monthly_payment, 2),
                    'interest_payment': round(interest_payment, 2),
                    'amortization': round(monthly_amortization, 2),
                    'balance': round(max(0, balance), 2)
                })
        else:
            # Sistema Price (Parcelas Fixas)
            if monthly_rate > 0:
                monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** loan_term) / ((1 + monthly_rate) ** loan_term - 1)
            else:
                monthly_payment = principal / loan_term
            
            for month in range(1, loan_term + 1):
                interest_payment = balance * monthly_rate
                amortization = monthly_payment - interest_payment
                balance -= amortization
                
                amortization_table.append({
                    'month': month,
                    'monthly_payment': round(monthly_payment, 2),
                    'interest_payment': round(interest_payment, 2),
                    'amortization': round(amortization, 2),
                    'balance': round(max(0, balance), 2)
                })
        
        # Resumo
        total_payments = sum(row['monthly_payment'] for row in amortization_table)
        total_interest = sum(row['interest_payment'] for row in amortization_table)
        
        # Retornar apenas os primeiros 60 meses para não sobrecarregar a resposta
        # O frontend pode solicitar mais dados se necessário
        limited_table = amortization_table[:60] if len(amortization_table) > 60 else amortization_table
        
        response = {
            'success': True,
            'amortization': {
                'system': system.upper(),
                'summary': {
                    'principal': round(principal, 2),
                    'total_payments': round(total_payments, 2),
                    'total_interest': round(total_interest, 2),
                    'loan_term_months': loan_term,
                    'interest_rate': interest_rate
                },
                'table': limited_table,
                'showing_months': len(limited_table),
                'total_months': len(amortization_table)
            }
        }
        
        logger.info(f"Tabela de amortização gerada para financiamento de R$ {principal} ({system.upper()})")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Erro ao gerar tabela de amortização: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor',
            'message': 'Ocorreu um erro ao gerar a tabela de amortização'
        }), 500

