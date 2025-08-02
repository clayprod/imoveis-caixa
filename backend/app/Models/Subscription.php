<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'plan_id',
        'status',
        'starts_at',
        'ends_at',
        'trial_ends_at',
        'gateway',
        'gateway_subscription_id',
        'gateway_customer_id',
        'last_payment_at',
        'next_payment_at',
        'payment_method',
        'auto_renew',
        'cancellation_reason',
        'cancelled_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'last_payment_at' => 'datetime',
        'next_payment_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'auto_renew' => 'boolean',
    ];

    // Relacionamentos
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    // Métodos de status
    public function isActive()
    {
        return $this->status === 'active' && 
               ($this->ends_at === null || $this->ends_at->isFuture());
    }

    public function isOnTrial()
    {
        return $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function isCancelled()
    {
        return $this->status === 'cancelled';
    }

    public function isExpired()
    {
        return $this->ends_at && $this->ends_at->isPast();
    }

    public function isPastDue()
    {
        return $this->status === 'past_due';
    }

    // Métodos de gestão
    public function cancel($reason = null)
    {
        $this->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
            'auto_renew' => false,
        ]);

        // Cancelar no gateway de pagamento
        $this->cancelInGateway();
    }

    public function resume()
    {
        if ($this->isCancelled() && !$this->isExpired()) {
            $this->update([
                'status' => 'active',
                'cancelled_at' => null,
                'cancellation_reason' => null,
                'auto_renew' => true,
            ]);

            // Reativar no gateway
            $this->resumeInGateway();
        }
    }

    public function renew($months = 1)
    {
        $newEndDate = $this->ends_at ? 
            $this->ends_at->addMonths($months) : 
            now()->addMonths($months);

        $this->update([
            'status' => 'active',
            'ends_at' => $newEndDate,
            'next_payment_at' => $newEndDate,
        ]);
    }

    // Métodos de pagamento
    public function recordPayment($amount, $gateway_payment_id, $method = null)
    {
        $payment = $this->payments()->create([
            'user_id' => $this->user_id,
            'amount' => $amount,
            'status' => 'completed',
            'gateway' => $this->gateway,
            'gateway_payment_id' => $gateway_payment_id,
            'payment_method' => $method,
            'paid_at' => now(),
        ]);

        $this->update([
            'status' => 'active',
            'last_payment_at' => now(),
            'next_payment_at' => now()->addMonth(),
        ]);

        return $payment;
    }

    // Métodos de gateway
    private function cancelInGateway()
    {
        switch ($this->gateway) {
            case 'stripe':
                $this->cancelStripeSubscription();
                break;
            case 'mercadopago':
                $this->cancelMercadoPagoSubscription();
                break;
            case 'pagseguro':
                $this->cancelPagSeguroSubscription();
                break;
        }
    }

    private function resumeInGateway()
    {
        switch ($this->gateway) {
            case 'stripe':
                $this->resumeStripeSubscription();
                break;
            case 'mercadopago':
                $this->resumeMercadoPagoSubscription();
                break;
            case 'pagseguro':
                $this->resumePagSeguroSubscription();
                break;
        }
    }

    // Métodos específicos do Stripe
    private function cancelStripeSubscription()
    {
        if ($this->gateway_subscription_id) {
            \Stripe\Stripe::setApiKey(config('services.stripe.secret'));
            
            try {
                \Stripe\Subscription::update($this->gateway_subscription_id, [
                    'cancel_at_period_end' => true
                ]);
            } catch (\Exception $e) {
                \Log::error('Erro ao cancelar assinatura no Stripe: ' . $e->getMessage());
            }
        }
    }

    private function resumeStripeSubscription()
    {
        if ($this->gateway_subscription_id) {
            \Stripe\Stripe::setApiKey(config('services.stripe.secret'));
            
            try {
                \Stripe\Subscription::update($this->gateway_subscription_id, [
                    'cancel_at_period_end' => false
                ]);
            } catch (\Exception $e) {
                \Log::error('Erro ao reativar assinatura no Stripe: ' . $e->getMessage());
            }
        }
    }

    // Métodos específicos do Mercado Pago
    private function cancelMercadoPagoSubscription()
    {
        // Implementar cancelamento no Mercado Pago
        // Usar SDK do Mercado Pago
    }

    private function resumeMercadoPagoSubscription()
    {
        // Implementar reativação no Mercado Pago
    }

    // Métodos específicos do PagSeguro
    private function cancelPagSeguroSubscription()
    {
        // Implementar cancelamento no PagSeguro
    }

    private function resumePagSeguroSubscription()
    {
        // Implementar reativação no PagSeguro
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->where(function ($q) {
                        $q->whereNull('ends_at')
                          ->orWhere('ends_at', '>', now());
                    });
    }

    public function scopeExpired($query)
    {
        return $query->where('ends_at', '<', now());
    }

    public function scopeOnTrial($query)
    {
        return $query->where('trial_ends_at', '>', now());
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    // Métodos de cálculo
    public function getDaysRemaining()
    {
        if (!$this->ends_at) return null;
        return max(0, $this->ends_at->diffInDays(now()));
    }

    public function getTrialDaysRemaining()
    {
        if (!$this->trial_ends_at) return 0;
        return max(0, $this->trial_ends_at->diffInDays(now()));
    }

    public function getTotalPaid()
    {
        return $this->payments()
                   ->where('status', 'completed')
                   ->sum('amount');
    }
}

