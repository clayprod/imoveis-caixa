#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter
import re

# Configurar matplotlib
plt.rcParams['font.family'] = ['DejaVu Sans']
plt.rcParams['figure.figsize'] = (12, 8)

def limpar_preco(preco_str):
    """Limpa e converte string de preço para float"""
    if pd.isna(preco_str) or preco_str == '':
        return np.nan
    
    # Remover espaços e converter vírgula para ponto
    preco_limpo = str(preco_str).strip().replace(',', '.')
    
    try:
        return float(preco_limpo)
    except:
        return np.nan

def extrair_info_descricao(descricao):
    """Extrai informações estruturadas da descrição"""
    if pd.isna(descricao):
        return {}
    
    info = {}
    
    # Extrair tipo de imóvel
    if 'Casa' in descricao:
        info['tipo'] = 'Casa'
    elif 'Apartamento' in descricao:
        info['tipo'] = 'Apartamento'
    elif 'Terreno' in descricao:
        info['tipo'] = 'Terreno'
    elif 'Galpão' in descricao:
        info['tipo'] = 'Galpão'
    elif 'Gleba' in descricao:
        info['tipo'] = 'Gleba'
    else:
        info['tipo'] = 'Outros'
    
    # Extrair número de quartos
    quartos_match = re.search(r'(\d+)\s+qto\(s\)', descricao)
    info['quartos'] = int(quartos_match.group(1)) if quartos_match else None
    
    # Extrair número de vagas
    vagas_match = re.search(r'(\d+)\s+vaga\(s\)', descricao)
    info['vagas'] = int(vagas_match.group(1)) if vagas_match else None
    
    # Extrair áreas
    area_total_match = re.search(r'(\d+\.?\d*)\s+de área total', descricao)
    info['area_total'] = float(area_total_match.group(1)) if area_total_match else None
    
    area_privativa_match = re.search(r'(\d+\.?\d*)\s+de área privativa', descricao)
    info['area_privativa'] = float(area_privativa_match.group(1)) if area_privativa_match else None
    
    area_terreno_match = re.search(r'(\d+\.?\d*)\s+de área do terreno', descricao)
    info['area_terreno'] = float(area_terreno_match.group(1)) if area_terreno_match else None
    
    return info

def analisar_dados_completa():
    """Análise completa e detalhada dos dados"""
    
    print("🏠 ANÁLISE DETALHADA DOS DADOS DE IMÓVEIS DA CAIXA")
    print("=" * 60)
    
    # Carregar dados
    df = pd.read_csv('/home/ubuntu/lista_imoveis_utf8.csv', 
                    sep=';', 
                    skiprows=2,
                    encoding='utf-8')
    
    # Renomear colunas
    df.columns = ['numero_imovel', 'uf', 'cidade', 'bairro', 'endereco', 
                 'preco', 'valor_avaliacao', 'desconto', 'descricao', 
                 'modalidade_venda', 'link_acesso']
    
    # Limpeza de dados
    df = df.dropna(subset=['numero_imovel'])
    df = df[df['numero_imovel'] != '']
    
    # Converter preços
    df['preco_num'] = df['preco'].apply(limpar_preco)
    df['valor_avaliacao_num'] = df['valor_avaliacao'].apply(limpar_preco)
    df['desconto_num'] = df['desconto'].apply(limpar_preco)
    
    print(f"📊 Total de imóveis: {len(df)}")
    print(f"📊 Imóveis com preço válido: {df['preco_num'].notna().sum()}")
    
    # Análise de preços válidos
    precos_validos = df[df['preco_num'].notna()]
    if len(precos_validos) > 0:
        print(f"\n💰 ANÁLISE DE PREÇOS (imóveis com preço válido):")
        print(f"   Preço médio: R$ {precos_validos['preco_num'].mean():,.2f}")
        print(f"   Preço mediano: R$ {precos_validos['preco_num'].median():,.2f}")
        print(f"   Menor preço: R$ {precos_validos['preco_num'].min():,.2f}")
        print(f"   Maior preço: R$ {precos_validos['preco_num'].max():,.2f}")
        
        # Faixas de preço
        print(f"\n💵 FAIXAS DE PREÇO:")
        faixas = [
            (0, 100000, "Até R$ 100k"),
            (100000, 300000, "R$ 100k - R$ 300k"),
            (300000, 500000, "R$ 300k - R$ 500k"),
            (500000, 1000000, "R$ 500k - R$ 1M"),
            (1000000, float('inf'), "Acima de R$ 1M")
        ]
        
        for min_val, max_val, label in faixas:
            count = len(precos_validos[(precos_validos['preco_num'] >= min_val) & 
                                     (precos_validos['preco_num'] < max_val)])
            print(f"   {label}: {count:,} imóveis")
    
    # Extrair informações estruturadas
    print(f"\n🔍 EXTRAINDO INFORMAÇÕES ESTRUTURADAS...")
    info_estruturada = []
    for idx, row in df.iterrows():
        info = extrair_info_descricao(row['descricao'])
        info['index'] = idx
        info_estruturada.append(info)
    
    df_info = pd.DataFrame(info_estruturada)
    df_completo = df.merge(df_info, left_index=True, right_on='index')
    
    # Análise por tipo de imóvel
    print(f"\n🏘️  ANÁLISE POR TIPO DE IMÓVEL:")
    tipos = df_completo['tipo'].value_counts()
    for tipo, count in tipos.items():
        subset = df_completo[df_completo['tipo'] == tipo]
        preco_medio = subset['preco_num'].mean()
        if not pd.isna(preco_medio):
            print(f"   {tipo}: {count:,} imóveis (preço médio: R$ {preco_medio:,.2f})")
        else:
            print(f"   {tipo}: {count:,} imóveis")
    
    # Análise de quartos
    print(f"\n🛏️  ANÁLISE DE QUARTOS:")
    quartos_stats = df_completo['quartos'].value_counts().sort_index()
    for quartos, count in quartos_stats.items():
        if not pd.isna(quartos):
            print(f"   {int(quartos)} quartos: {count:,} imóveis")
    
    # Salvar dados processados
    df_completo.to_csv('/home/ubuntu/dados_processados.csv', index=False, encoding='utf-8')
    
    # Criar visualizações
    criar_visualizacoes(df_completo)
    
    print(f"\n✅ Análise completa finalizada!")
    print(f"📁 Dados processados salvos em: /home/ubuntu/dados_processados.csv")
    
    return df_completo

def criar_visualizacoes(df):
    """Cria visualizações dos dados"""
    
    # Gráfico 1: Distribuição por UF
    plt.figure(figsize=(15, 8))
    uf_counts = df['uf'].str.strip().value_counts().head(15)
    plt.subplot(2, 2, 1)
    uf_counts.plot(kind='bar')
    plt.title('Distribuição de Imóveis por Estado')
    plt.xlabel('Estado')
    plt.ylabel('Quantidade de Imóveis')
    plt.xticks(rotation=45)
    
    # Gráfico 2: Distribuição por tipo
    plt.subplot(2, 2, 2)
    tipo_counts = df['tipo'].value_counts()
    plt.pie(tipo_counts.values, labels=tipo_counts.index, autopct='%1.1f%%')
    plt.title('Distribuição por Tipo de Imóvel')
    
    # Gráfico 3: Distribuição de preços
    plt.subplot(2, 2, 3)
    precos_validos = df[df['preco_num'].notna() & (df['preco_num'] > 0)]
    if len(precos_validos) > 0:
        plt.hist(precos_validos['preco_num'], bins=50, alpha=0.7)
        plt.title('Distribuição de Preços')
        plt.xlabel('Preço (R$)')
        plt.ylabel('Frequência')
        plt.ticklabel_format(style='plain', axis='x')
    
    # Gráfico 4: Modalidades de venda
    plt.subplot(2, 2, 4)
    modalidades = df['modalidade_venda'].str.strip().value_counts()
    modalidades.plot(kind='bar')
    plt.title('Modalidades de Venda')
    plt.xlabel('Modalidade')
    plt.ylabel('Quantidade')
    plt.xticks(rotation=45)
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/analise_imoveis.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"📊 Gráficos salvos em: /home/ubuntu/analise_imoveis.png")

if __name__ == "__main__":
    df = analisar_dados_completa()

