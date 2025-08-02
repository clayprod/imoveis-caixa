<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChangeDetectionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'url',
        'severity',
        'changes_detected',
        'action_taken',
        'requires_attention',
        'snapshot_id',
        'error_message',
        'resolved_at',
        'resolved_by',
    ];

    protected $casts = [
        'changes_detected' => 'array',
        'requires_attention' => 'boolean',
        'resolved_at' => 'datetime',
    ];

    public function snapshot()
    {
        return $this->belongsTo(StructureSnapshot::class);
    }

    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function scopePending($query)
    {
        return $query->where('requires_attention', true)
                    ->whereNull('resolved_at');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }
}

