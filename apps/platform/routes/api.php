<?php

use App\Models\Project;
use App\Models\Scenario;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return [
        'service' => 'loadpath-meridian-platform',
        'status' => 'ok',
    ];
});

Route::get('/projects', function () {
    return [
        'data' => Project::query()
            ->withCount('scenarios')
            ->orderBy('name')
            ->get(),
    ];
});

Route::get('/projects/{project}', function (Project $project) {
    return [
        'data' => $project->load('scenarios'),
    ];
});

Route::get('/projects/{project}/scenarios', function (Project $project) {
    return [
        'data' => $project->scenarios()
            ->orderBy('name')
            ->get(),
    ];
});

Route::get('/projects/{project}/scenarios/{scenario}', function (Project $project, Scenario $scenario) {
    abort_unless($scenario->project_id === $project->id, 404);

    return [
        'data' => $scenario,
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
