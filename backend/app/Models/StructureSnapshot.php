<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StructureSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'url',
        'url_hash',
        'type',
        'content_hash',
        'structure_data',
        'confidence_score',
        'last_checked_at',
        'parent_snapshot_id',
    ];

    protected $casts = [
        'structure_data' => 'array',
        'confidence_score' => 'float',
        'last_checked_at' => 'datetime',
    ];

    public function parent()
    {
        return $this->belongsTo(StructureSnapshot::class, 'parent_snapshot_id');
    }

    public function children()
    {
        return $this->hasMany(StructureSnapshot::class, 'parent_snapshot_id');
    }

    public function changeLogs()
    {
        return $this->hasMany(ChangeDetectionLog::class, 'snapshot_id');
    }
}

