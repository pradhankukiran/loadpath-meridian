<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return [
        'service' => 'loadpath-meridian-platform',
        'status' => 'ok',
    ];
});

Route::get('/projects', function () {
    return [
        'data' => [
            [
                'id' => 'prj_nw_grid',
                'name' => 'North West grid reinforcement',
                'region' => 'United Kingdom',
                'scenario_count' => 8,
                'status' => 'active',
            ],
            [
                'id' => 'prj_solar_storage',
                'name' => 'Solar and storage capacity study',
                'region' => 'Arizona, United States',
                'scenario_count' => 5,
                'status' => 'review',
            ],
        ],
    ];
});

Route::get('/subscriptions/current', function () {
    return [
        'plan' => 'private-beta',
        'simulation_minutes_included' => 5000,
        'simulation_minutes_used' => 1284,
        'features' => [
            'cloud_simulations',
            'scenario_comparison',
            'modal_ai_assistant',
        ],
    ];
});
