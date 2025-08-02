import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Calculator, TrendingUp, DollarSign, Calendar, AlertTriangle, Info } from 'lucide-react';

const PropertyFinancingSimulator = ({ property }) => {
  const [formData, setFormData] = useState({
    // Dados do imóvel
    propertyValue: property?.valor_venda || 0,
    declaredValue: property?.valor_venda || 0,
    
    // Financiamento
    interestRate: 7.1, // Taxa média anual
    loanTerm: 360, // 30 anos em meses
    downPayment: 0, // Entrada
    
    // Custos de aquisição
    documentationCosts: 0, // 5% do valor (calculado automaticamente)
    auctionCommission: 5, // % comissão leiloeiro
    
    // Débitos pendentes
    waterBill: 0,
    electricityBill: 0,
    condominiumFees: 0,
    iptuArrears: 0,
    otherDebts: 0,
    
    // Cenário de venda
    salePrice: 0,
    timeToSell: 22, // meses
    rentalTime: 18, // meses alugado
    monthlyRent: 0,
    monthlyIptu: 0,
    monthlyCondominium: 0,
    maintenanceReforms: 0,
    brokerCommission: 6, // % na venda
    
    // IR sobre venda
    isFirstProperty: true,
    willReinvest: true
  });

  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('inputs');

  // Calcular custos automaticamente
  useEffect(() => {
    const docCosts = formData.propertyValue * 0.05; // 5% do valor
    setFormData(prev => ({
      ...prev,
      documentationCosts: docCosts,
      salePrice: prev.salePrice || formData.propertyValue * 1.2, // 20% de valorização padrão
      monthlyRent: prev.monthlyRent || formData.propertyValue * 0.006 // 0.6% ao mês
    }));
  }, [formData.propertyValue]);

  const calculateFinancing = () => {
    const P = formData.propertyValue - formData.downPayment; // Principal
    const r = formData.interestRate / 100 / 12; // Taxa mensal
    const n = formData.loanTerm; // Número de parcelas
    
    // Cálculo da parcela (Sistema Price)
    const monthlyPayment = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    // Custos totais de aquisição
    const totalAcquisitionCosts = 
      formData.propertyValue +
      formData.documentationCosts +
      (formData.propertyValue * formData.auctionCommission / 100) +
      formData.waterBill +
      formData.electricityBill +
      formData.condominiumFees +
      formData.iptuArrears +
      formData.otherDebts;
    
    // Custos mensais durante o período
    const monthlyCosts = 
      monthlyPayment +
      formData.monthlyIptu +
      formData.monthlyCondominium;
    
    // Receita de aluguel
    const totalRentalIncome = formData.monthlyRent * formData.rentalTime;
    
    // Custos até a venda
    const totalMonthlyCosts = monthlyCosts * formData.timeToSell;
    const totalCostUntilSale = totalAcquisitionCosts + totalMonthlyCosts + formData.maintenanceReforms;
    
    // Valor presente dos custos
    const presentValueCosts = calculatePresentValue(totalCostUntilSale, formData.interestRate / 100, formData.timeToSell / 12);
    
    // Receita da venda
    const brokerFee = formData.salePrice * formData.brokerCommission / 100;
    
    // Imposto de Renda sobre ganho de capital
    let capitalGainsTax = 0;
    const capitalGain = formData.salePrice - formData.propertyValue;
    
    if (!formData.isFirstProperty || !formData.willReinvest) {
      capitalGainsTax = capitalGain > 0 ? capitalGain * 0.15 : 0; // 15% sobre o ganho
    }
    
    const netSaleValue = formData.salePrice - brokerFee - capitalGainsTax;
    
    // Resultado final
    const totalInvestment = totalAcquisitionCosts - formData.propertyValue + formData.downPayment;
    const finalProfit = netSaleValue + totalRentalIncome - totalCostUntilSale;
    const totalReturn = (finalProfit / totalInvestment) * 100;
    const annualReturn = (Math.pow(1 + finalProfit / totalInvestment, 12 / formData.timeToSell) - 1) * 100;
    
    // Rentabilidade real (descontando inflação)
    const inflation = 4.68; // % ao ano
    const realReturn = annualReturn - inflation;
    
    // Comparação com outros investimentos
    const cdi = 12.5; // % ao ano
    const savings = 6.2; // % ao ano
    const stocks = 15.0; // % ao ano (média histórica)
    
    setResults({
      monthlyPayment,
      totalAcquisitionCosts,
      monthlyCosts,
      totalRentalIncome,
      totalCostUntilSale,
      presentValueCosts,
      netSaleValue,
      capitalGainsTax,
      finalProfit,
      totalReturn,
      annualReturn,
      realReturn,
      totalInvestment,
      comparisons: {
        cdi,
        savings,
        stocks
      },
      breakdown: {
        propertyValue: formData.propertyValue,
        documentationCosts: formData.documentationCosts,
        auctionCommission: formData.propertyValue * formData.auctionCommission / 100,
        pendingDebts: formData.waterBill + formData.electricityBill + formData.condominiumFees + formData.iptuArrears + formData.otherDebts,
        brokerFee,
        maintenanceReforms: formData.maintenanceReforms
      }
    });
    
    setActiveTab('results');
  };

  const calculatePresentValue = (futureValue, rate, years) => {
    return futureValue / Math.pow(1 + rate, years);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getReturnColor = (value) => {
    if (value > 15) return 'text-green-600';
    if (value > 8) return 'text-blue-600';
    if (value > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Simulador de Financiamento Imobiliário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inputs">Dados do Investimento</TabsTrigger>
            <TabsTrigger value="results" disabled={!results}>Resultados</TabsTrigger>
            <TabsTrigger value="comparison" disabled={!results}>Comparações</TabsTrigger>
          </TabsList>

          <TabsContent value="inputs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Dados do Imóvel */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-600">Dados do Imóvel</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="propertyValue">Valor do Imóvel</Label>
                  <Input
                    id="propertyValue"
                    type="number"
                    value={formData.propertyValue}
                    onChange={(e) => setFormData({...formData, propertyValue: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 191.280,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="declaredValue">Valor Declarado</Label>
                  <Input
                    id="declaredValue"
                    type="number"
                    value={formData.declaredValue}
                    onChange={(e) => setFormData({...formData, declaredValue: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 191.280,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="downPayment">Entrada</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    value={formData.downPayment}
                    onChange={(e) => setFormData({...formData, downPayment: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 10.080,00"
                  />
                </div>
              </div>

              {/* Financiamento */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-600">Financiamento</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Taxa de Juros (% a.a.)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({...formData, interestRate: parseFloat(e.target.value) || 0})}
                    placeholder="7.1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loanTerm">Prazo (meses)</Label>
                  <Input
                    id="loanTerm"
                    type="number"
                    value={formData.loanTerm}
                    onChange={(e) => setFormData({...formData, loanTerm: parseInt(e.target.value) || 0})}
                    placeholder="360"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auctionCommission">Comissão Leilão (%)</Label>
                  <Input
                    id="auctionCommission"
                    type="number"
                    step="0.1"
                    value={formData.auctionCommission}
                    onChange={(e) => setFormData({...formData, auctionCommission: parseFloat(e.target.value) || 0})}
                    placeholder="5.0"
                  />
                </div>
              </div>

              {/* Débitos Pendentes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600">Débitos Pendentes</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="waterBill">Conta de Água</Label>
                  <Input
                    id="waterBill"
                    type="number"
                    value={formData.waterBill}
                    onChange={(e) => setFormData({...formData, waterBill: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="electricityBill">Conta de Energia</Label>
                  <Input
                    id="electricityBill"
                    type="number"
                    value={formData.electricityBill}
                    onChange={(e) => setFormData({...formData, electricityBill: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condominiumFees">Condomínio Atrasado</Label>
                  <Input
                    id="condominiumFees"
                    type="number"
                    value={formData.condominiumFees}
                    onChange={(e) => setFormData({...formData, condominiumFees: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iptuArrears">IPTU Atrasado</Label>
                  <Input
                    id="iptuArrears"
                    type="number"
                    value={formData.iptuArrears}
                    onChange={(e) => setFormData({...formData, iptuArrears: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 891,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherDebts">Outros Débitos</Label>
                  <Input
                    id="otherDebts"
                    type="number"
                    value={formData.otherDebts}
                    onChange={(e) => setFormData({...formData, otherDebts: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              {/* Cenário de Venda */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-600">Cenário de Venda</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 290.000,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeToSell">Tempo até Venda (meses)</Label>
                  <Input
                    id="timeToSell"
                    type="number"
                    value={formData.timeToSell}
                    onChange={(e) => setFormData({...formData, timeToSell: parseInt(e.target.value) || 0})}
                    placeholder="22"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brokerCommission">Comissão Corretor (%)</Label>
                  <Input
                    id="brokerCommission"
                    type="number"
                    step="0.1"
                    value={formData.brokerCommission}
                    onChange={(e) => setFormData({...formData, brokerCommission: parseFloat(e.target.value) || 0})}
                    placeholder="6.0"
                  />
                </div>
              </div>

              {/* Receitas e Custos Mensais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600">Receitas e Custos</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Aluguel Mensal</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({...formData, monthlyRent: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 1.800,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rentalTime">Tempo Alugado (meses)</Label>
                  <Input
                    id="rentalTime"
                    type="number"
                    value={formData.rentalTime}
                    onChange={(e) => setFormData({...formData, rentalTime: parseInt(e.target.value) || 0})}
                    placeholder="18"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyIptu">IPTU Mensal</Label>
                  <Input
                    id="monthlyIptu"
                    type="number"
                    value={formData.monthlyIptu}
                    onChange={(e) => setFormData({...formData, monthlyIptu: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 94,25"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyCondominium">Condomínio Mensal</Label>
                  <Input
                    id="monthlyCondominium"
                    type="number"
                    value={formData.monthlyCondominium}
                    onChange={(e) => setFormData({...formData, monthlyCondominium: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenanceReforms">Reformas/Manutenção</Label>
                  <Input
                    id="maintenanceReforms"
                    type="number"
                    value={formData.maintenanceReforms}
                    onChange={(e) => setFormData({...formData, maintenanceReforms: parseFloat(e.target.value) || 0})}
                    placeholder="R$ 5.930,33"
                  />
                </div>
              </div>

              {/* Imposto de Renda */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-600">Imposto de Renda</h3>
                
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isFirstProperty}
                      onChange={(e) => setFormData({...formData, isFirstProperty: e.target.checked})}
                    />
                    <span>Primeiro imóvel nos últimos 5 anos</span>
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.willReinvest}
                      onChange={(e) => setFormData({...formData, willReinvest: e.target.checked})}
                    />
                    <span>Reinvestir em outro imóvel</span>
                  </Label>
                </div>

                <div className="text-sm text-gray-500">
                  <Info className="h-4 w-4 inline mr-1" />
                  Se for o primeiro imóvel em 5 anos E reinvestir, não há IR sobre ganho de capital
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <Button onClick={calculateFinancing} size="lg" className="px-8">
                <Calculator className="h-5 w-5 mr-2" />
                Calcular Viabilidade
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {results && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Resumo Financeiro */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-600">Resumo Financeiro</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Parcela Mensal:</span>
                      <span className="font-semibold">{formatCurrency(results.monthlyPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Investimento Total:</span>
                      <span className="font-semibold">{formatCurrency(results.totalInvestment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custo Total até Venda:</span>
                      <span className="font-semibold">{formatCurrency(results.totalCostUntilSale)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Receita de Aluguel:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(results.totalRentalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor Líquido Venda:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(results.netSaleValue)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Rentabilidade */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-green-600">Rentabilidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Lucro/Prejuízo:</span>
                      <span className={`font-semibold ${results.finalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(results.finalProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retorno Total:</span>
                      <span className={`font-semibold ${getReturnColor(results.totalReturn)}`}>
                        {formatPercentage(results.totalReturn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retorno Anual:</span>
                      <span className={`font-semibold ${getReturnColor(results.annualReturn)}`}>
                        {formatPercentage(results.annualReturn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retorno Real (s/ inflação):</span>
                      <span className={`font-semibold ${getReturnColor(results.realReturn)}`}>
                        {formatPercentage(results.realReturn)}
                      </span>
                    </div>
                    <Separator />
                    <div className="text-center">
                      <Badge variant={results.finalProfit >= 0 ? "default" : "destructive"} className="text-sm">
                        {results.finalProfit >= 0 ? "INVESTIMENTO VIÁVEL" : "INVESTIMENTO ARRISCADO"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Breakdown de Custos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Breakdown de Custos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Valor do Imóvel:</span>
                      <span>{formatCurrency(results.breakdown.propertyValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Documentação (5%):</span>
                      <span>{formatCurrency(results.breakdown.documentationCosts)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Comissão Leilão:</span>
                      <span>{formatCurrency(results.breakdown.auctionCommission)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Débitos Pendentes:</span>
                      <span>{formatCurrency(results.breakdown.pendingDebts)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Reformas/Manutenção:</span>
                      <span>{formatCurrency(results.breakdown.maintenanceReforms)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Comissão Venda:</span>
                      <span>{formatCurrency(results.breakdown.brokerFee)}</span>
                    </div>
                    {results.capitalGainsTax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>IR Ganho Capital:</span>
                        <span>{formatCurrency(results.capitalGainsTax)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline do Investimento */}
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-600">Timeline do Investimento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <div className="font-semibold">Aquisição</div>
                        <div className="text-sm text-gray-600">Mês 0</div>
                        <div className="text-sm font-medium">{formatCurrency(results.totalAcquisitionCosts)}</div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <div className="font-semibold">Período Locação</div>
                        <div className="text-sm text-gray-600">{formData.rentalTime} meses</div>
                        <div className="text-sm font-medium">{formatCurrency(results.totalRentalIncome)}</div>
                      </div>
                      
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                        <div className="font-semibold">Custos Mensais</div>
                        <div className="text-sm text-gray-600">{formData.timeToSell} meses</div>
                        <div className="text-sm font-medium">{formatCurrency(results.monthlyCosts)}/mês</div>
                      </div>
                      
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Calculator className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <div className="font-semibold">Venda</div>
                        <div className="text-sm text-gray-600">Mês {formData.timeToSell}</div>
                        <div className="text-sm font-medium">{formatCurrency(results.netSaleValue)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            {results && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Comparação com Outros Investimentos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-600">Comparação de Investimentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-semibold">Imóvel (Este)</div>
                          <div className="text-sm text-gray-600">Retorno anual</div>
                        </div>
                        <div className={`text-right font-semibold ${getReturnColor(results.annualReturn)}`}>
                          {formatPercentage(results.annualReturn)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div>
                          <div className="font-semibold">CDI</div>
                          <div className="text-sm text-gray-600">Renda fixa</div>
                        </div>
                        <div className="text-right font-semibold text-blue-600">
                          {formatPercentage(results.comparisons.cdi)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-semibold">Poupança</div>
                          <div className="text-sm text-gray-600">Baixo risco</div>
                        </div>
                        <div className="text-right font-semibold text-green-600">
                          {formatPercentage(results.comparisons.savings)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <div>
                          <div className="font-semibold">Ações (Ibovespa)</div>
                          <div className="text-sm text-gray-600">Alto risco</div>
                        </div>
                        <div className="text-right font-semibold text-purple-600">
                          {formatPercentage(results.comparisons.stocks)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Análise de Risco */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Análise de Risco</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm">Risco de Vacância</div>
                          <div className="text-xs text-gray-600">Períodos sem inquilino podem reduzir a rentabilidade</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm">Risco de Desvalorização</div>
                          <div className="text-xs text-gray-600">O imóvel pode não valorizar conforme esperado</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm">Risco de Liquidez</div>
                          <div className="text-xs text-gray-600">Imóveis podem demorar para vender</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-5 w-5 text-purple-500 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm">Custos Não Previstos</div>
                          <div className="text-xs text-gray-600">Reformas e manutenções podem exceder o orçado</div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-sm">
                      <div className="font-semibold mb-2">Recomendações:</div>
                      <ul className="space-y-1 text-xs text-gray-600">
                        <li>• Reserve 20% do orçamento para imprevistos</li>
                        <li>• Considere seguros para o imóvel</li>
                        <li>• Analise o mercado local detalhadamente</li>
                        <li>• Tenha reserva para 6 meses sem aluguel</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PropertyFinancingSimulator;

