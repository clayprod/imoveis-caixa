<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('plan_id')->constrained();
            $table->string('gateway'); // stripe, mercadopago, etc
            $table->string('gateway_subscription_id')->unique();
            $table->string('gateway_customer_id')->nullable();
            
            $table->enum('status', [
                'active', 
                'canceled', 
                'past_due', 
                'unpaid', 
                'trialing',
                'paused'
            ])->default('active');
            
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('paused_until')->nullable();
            
            $table->json('metadata')->nullable(); // Dados extras do gateway
            
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index(['gateway', 'gateway_subscription_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};

