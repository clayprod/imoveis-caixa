<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->integer('price_cents'); // Preço em centavos
            $table->string('currency', 3)->default('BRL');
            $table->enum('interval', ['monthly', 'yearly'])->default('monthly');
            $table->json('features'); // Funcionalidades do plano
            $table->json('limits'); // Limites do plano
            $table->boolean('active')->default(true);
            $table->integer('sort_order')->default(0);
            
            // IDs nos gateways de pagamento
            $table->string('stripe_price_id')->nullable();
            $table->string('mercadopago_plan_id')->nullable();
            $table->string('pagseguro_plan_id')->nullable();
            $table->string('asaas_plan_id')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};

