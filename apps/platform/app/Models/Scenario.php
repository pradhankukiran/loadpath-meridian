<?php

namespace App\Models;

use Database\Factories\ScenarioFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'id',
    'project_id',
    'name',
    'objective',
    'engine',
    'status',
    'horizon',
    'annual_demand_mwh',
    'peak_load_mw',
    'renewable_share_target',
    'assumptions',
])]
class Scenario extends Model
{
    /** @use HasFactory<ScenarioFactory> */
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'annual_demand_mwh' => 'float',
            'peak_load_mw' => 'float',
            'renewable_share_target' => 'float',
            'assumptions' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
