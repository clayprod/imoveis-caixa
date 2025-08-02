<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Carbon\Carbon;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'cpf_cnpj',
        'company_name',
        'role',
        'status',
        'email_verified_at',
        'trial_ends_at',
        'last_login_at',
        'login_count',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'referral_code',
        'referred_by',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'last_login_at' => 'datetime',
        'password' => 'hashed',
    ];

    // Relacionamentos
    public function subscription()
    {
        return $this->hasOne(Subscription::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function searches()
    {
        return $this->hasMany(PropertySearch::class);
    }

    public function favorites()
    {
        return $this->hasMany(FavoriteProperty::class);
    }

    public function alerts()
    {
        return $this->hasMany(PropertyAlert::class);
    }

    // Métodos de verificação de plano
    public function hasActivePlan()
    {
        return $this->subscription && $this->subscription->isActive();
    }

    public function getCurrentPlan()
    {
        return $this->subscription ? $this->subscription->plan : null;
    }

    public function canAccessFeature($feature)
    {
        $plan = $this->getCurrentPlan();
        if (!$plan) return false;

        $features = json_decode($plan->features, true);
        return isset($features[$feature]) && $features[$feature];
    }

    public function isOnTrial()
    {
        return $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function trialDaysRemaining()
    {
        if (!$this->isOnTrial()) return 0;
        return $this->trial_ends_at->diffInDays(now());
    }

    // Métodos de limite de uso
    public function getMonthlySearchLimit()
    {
        $plan = $this->getCurrentPlan();
        if (!$plan) return 10; // Limite para usuários sem plano
        
        $features = json_decode($plan->features, true);
        return $features['monthly_searches'] ?? 10;
    }

    public function getMonthlySearchCount()
    {
        return $this->searches()
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
    }

    public function canMakeSearch()
    {
        if ($this->role === 'admin') return true;
        
        $limit = $this->getMonthlySearchLimit();
        $used = $this->getMonthlySearchCount();
        
        return $used < $limit;
    }

    // Métodos de administração
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    public function isSuperAdmin()
    {
        return $this->role === 'super_admin';
    }

    // Métodos de analytics
    public function updateLoginStats()
    {
        $this->update([
            'last_login_at' => now(),
            'login_count' => $this->login_count + 1,
        ]);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeWithActivePlan($query)
    {
        return $query->whereHas('subscription', function ($q) {
            $q->where('status', 'active')
              ->where('ends_at', '>', now());
        });
    }

    public function scopeOnTrial($query)
    {
        return $query->where('trial_ends_at', '>', now());
    }

    // Métodos de referral
    public function generateReferralCode()
    {
        if (!$this->referral_code) {
            $this->referral_code = strtoupper(substr($this->name, 0, 3) . rand(1000, 9999));
            $this->save();
        }
        return $this->referral_code;
    }

    public function getReferrals()
    {
        return self::where('referred_by', $this->id)->get();
    }

    public function getReferralCount()
    {
        return self::where('referred_by', $this->id)->count();
    }
}

