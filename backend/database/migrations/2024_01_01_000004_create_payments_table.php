<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('subscription_id')->nullable()->constrained()->onDelete('set null');
            
            $table->string('gateway'); // stripe, mercadopago, etc
            $table->string('gateway_payment_id')->unique();
            $table->string('gateway_customer_id')->nullable();
            
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('BRL');
            $table->string('description');
            
            $table->enum('status', [
                'pending',
                'processing', 
                'succeeded',
                'failed',
                'canceled',
                'refunded'
            ])->default('pending');
            
            $table->enum('type', [
                'subscription',
                'one_time',
                'upgrade',
                'refund'
            ])->default('subscription');
            
            $table->string('payment_method')->nullable(); // credit_card, pix, boleto
            $table->json('gateway_response')->nullable();
            $table->text('failure_reason')->nullable();
            
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index(['gateway', 'gateway_payment_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};

