#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter
import re

# Configurar matplotlib para usar fonte que suporte caracteres especiais
plt.rcParams['font.family'] = ['DejaVu Sans']

def analisar_dados_imoveis():
    """Análise completa dos dados de imóveis da Caixa"""
    
    print("🏠 ANÁLISE DOS DADOS DE IMÓVEIS DA CAIXA ECONÔMICA FEDERAL")
    print("=" * 60)
    
    # Carregar dados
    try:
        df = pd.read_csv('/home/ubuntu/lista_imoveis_utf8.csv', 
                        sep=';', 
                        skiprows=2,  # Pular cabeçalho
                        encoding='utf-8')
        
        # Renomear colunas
        df.columns = ['numero_imovel', 'uf', 'cidade', 'bairro', 'endereco', 
                     'preco', 'valor_avaliacao', 'desconto', 'descricao', 
                     'modalidade_venda', 'link_acesso']
        
        print(f"📊 Total de imóveis carregados: {len(df)}")
        print(f"📊 Colunas disponíveis: {list(df.columns)}")
        
        # Limpeza básica de dados
        df = df.dropna(subset=['numero_imovel'])
        df = df[df['numero_imovel'] != '']
        
        # Converter preços para numérico
        df['preco'] = pd.to_numeric(df['preco'].astype(str).str.replace(',', '.'), errors='coerce')
        df['valor_avaliacao'] = pd.to_numeric(df['valor_avaliacao'].astype(str).str.replace(',', '.'), errors='coerce')
        df['desconto'] = pd.to_numeric(df['desconto'].astype(str).str.replace(',', '.'), errors='coerce')
        
        print(f"📊 Imóveis válidos após limpeza: {len(df)}")
        
        # Análise por UF
        print("\n🗺️  DISTRIBUIÇÃO POR ESTADO:")
        uf_counts = df['uf'].str.strip().value_counts()
        for uf, count in uf_counts.head(10).items():
            print(f"   {uf}: {count:,} imóveis")
        
        # Análise de preços
        print(f"\n💰 ANÁLISE DE PREÇOS:")
        print(f"   Preço médio: R$ {df['preco'].mean():,.2f}")
        print(f"   Preço mediano: R$ {df['preco'].median():,.2f}")
        print(f"   Menor preço: R$ {df['preco'].min():,.2f}")
        print(f"   Maior preço: R$ {df['preco'].max():,.2f}")
        
        # Análise de descontos
        print(f"\n🏷️  ANÁLISE DE DESCONTOS:")
        print(f"   Desconto médio: {df['desconto'].mean():.2f}%")
        print(f"   Desconto mediano: {df['desconto'].median():.2f}%")
        print(f"   Maior desconto: {df['desconto'].max():.2f}%")
        
        # Análise de modalidades de venda
        print(f"\n🔨 MODALIDADES DE VENDA:")
        modalidades = df['modalidade_venda'].str.strip().value_counts()
        for modalidade, count in modalidades.items():
            print(f"   {modalidade}: {count:,} imóveis")
        
        # Análise de tipos de imóveis (extrair da descrição)
        print(f"\n🏘️  TIPOS DE IMÓVEIS:")
        tipos_imoveis = []
        for desc in df['descricao'].fillna(''):
            if 'Casa' in desc:
                tipos_imoveis.append('Casa')
            elif 'Apartamento' in desc:
                tipos_imoveis.append('Apartamento')
            elif 'Terreno' in desc:
                tipos_imoveis.append('Terreno')
            elif 'Galpão' in desc:
                tipos_imoveis.append('Galpão')
            elif 'Gleba' in desc:
                tipos_imoveis.append('Gleba')
            else:
                tipos_imoveis.append('Outros')
        
        tipo_counts = Counter(tipos_imoveis)
        for tipo, count in tipo_counts.items():
            print(f"   {tipo}: {count:,} imóveis")
        
        # Análise de cidades com mais imóveis
        print(f"\n🏙️  CIDADES COM MAIS IMÓVEIS:")
        cidades = df['cidade'].str.strip().value_counts()
        for cidade, count in cidades.head(10).items():
            print(f"   {cidade}: {count:,} imóveis")
        
        # Análise de padrões na descrição
        print(f"\n📝 ANÁLISE DE DESCRIÇÕES:")
        descricoes_vazias = df['descricao'].isna().sum() + (df['descricao'] == '.').sum()
        print(f"   Descrições vazias ou apenas '.': {descricoes_vazias:,}")
        print(f"   Percentual de descrições problemáticas: {(descricoes_vazias/len(df)*100):.1f}%")
        
        # Extrair informações estruturadas das descrições
        print(f"\n🔍 EXTRAÇÃO DE DADOS ESTRUTURADOS:")
        quartos_pattern = r'(\d+)\s+qto\(s\)'
        vagas_pattern = r'(\d+)\s+vaga\(s\)'
        area_total_pattern = r'(\d+\.?\d*)\s+de área total'
        area_privativa_pattern = r'(\d+\.?\d*)\s+de área privativa'
        area_terreno_pattern = r'(\d+\.?\d*)\s+de área do terreno'
        
        quartos_extraidos = 0
        vagas_extraidas = 0
        areas_extraidas = 0
        
        for desc in df['descricao'].fillna(''):
            if re.search(quartos_pattern, desc):
                quartos_extraidos += 1
            if re.search(vagas_pattern, desc):
                vagas_extraidas += 1
            if re.search(area_total_pattern, desc):
                areas_extraidas += 1
        
        print(f"   Imóveis com info de quartos: {quartos_extraidos:,}")
        print(f"   Imóveis com info de vagas: {vagas_extraidas:,}")
        print(f"   Imóveis com info de área: {areas_extraidas:,}")
        
        # Salvar amostra para análise
        amostra = df.head(100)
        amostra.to_csv('/home/ubuntu/amostra_imoveis.csv', index=False, encoding='utf-8')
        
        print(f"\n✅ Análise concluída! Amostra salva em: /home/ubuntu/amostra_imoveis.csv")
        
        return df
        
    except Exception as e:
        print(f"❌ Erro na análise: {str(e)}")
        return None

if __name__ == "__main__":
    df = analisar_dados_imoveis()

