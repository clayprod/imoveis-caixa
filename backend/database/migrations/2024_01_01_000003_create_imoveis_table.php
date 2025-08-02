<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imoveis', function (Blueprint $table) {
            $table->id();
            $table->string('numero_imovel')->unique();
            $table->string('uf', 2);
            $table->string('cidade');
            $table->string('bairro')->nullable();
            $table->text('endereco');
            $table->decimal('preco', 12, 2)->nullable();
            $table->decimal('valor_avaliacao', 12, 2)->nullable();
            $table->decimal('desconto', 5, 2)->nullable();
            $table->text('descricao')->nullable();
            $table->string('modalidade_venda');
            $table->text('link_acesso');
            
            // Dados extraídos por parsing/IA
            $table->string('tipo_imovel')->nullable(); // Casa, Apartamento, Terreno
            $table->integer('quartos')->nullable();
            $table->integer('banheiros')->nullable();
            $table->integer('vagas_garagem')->nullable();
            $table->decimal('area_total', 8, 2)->nullable();
            $table->decimal('area_privativa', 8, 2)->nullable();
            $table->decimal('area_terreno', 8, 2)->nullable();
            
            // Informações críticas de financiamento
            $table->boolean('aceita_financiamento')->nullable();
            $table->boolean('aceita_fgts')->nullable();
            $table->json('formas_pagamento')->nullable();
            $table->string('responsavel_condominio')->nullable();
            $table->string('responsavel_tributos')->nullable();
            $table->string('status_ocupacao')->nullable();
            
            // Geolocalização
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('cep', 9)->nullable();
            
            // Análise de mercado
            $table->decimal('preco_m2_mercado', 8, 2)->nullable();
            $table->decimal('roi_estimado', 5, 2)->nullable();
            $table->integer('score_oportunidade')->nullable(); // 1-10
            
            // Metadados
            $table->enum('fonte_dados', ['csv', 'scraping', 'manual'])->default('csv');
            $table->decimal('confianca_dados', 3, 2)->default(1.00);
            $table->timestamp('ultima_atualizacao')->nullable();
            $table->timestamp('proxima_verificacao')->nullable();
            
            $table->timestamps();
            
            // Índices para performance
            $table->index(['uf', 'cidade']);
            $table->index(['tipo_imovel', 'preco']);
            $table->index(['aceita_financiamento', 'modalidade_venda']);
            $table->index(['score_oportunidade', 'preco']);
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imoveis');
    }
};

