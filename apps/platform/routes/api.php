<?php

use App\Models\Project;
use App\Models\Scenario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

if (! function_exists('meridian_resource_id')) {
    function meridian_resource_id(string $prefix, string $name): string
    {
        $suffix = Str::lower(Str::random(5));
        $maxSlugLength = 36 - strlen($prefix) - strlen($suffix) - 2;
        $slug = Str::of($name)->slug('_')->limit($maxSlugLength, '');

        return "{$prefix}_{$slug}_{$suffix}";
    }
}

Route::get('/health', function () {
    return [
        'service' => 'loadpath-meridian-platform',
        'status' => 'ok',
    ];
});

Route::get('/operations/status', function () {
    $databaseStatus = 'ok';

    try {
        DB::connection()->getPdo();
    } catch (Throwable) {
        $databaseStatus = 'unavailable';
    }

    return [
        'data' => [
            'service' => 'loadpath-meridian-platform',
            'status' => $databaseStatus === 'ok' ? 'ok' : 'degraded',
            'environment' => app()->environment(),
            'checks' => [
                'database' => $databaseStatus,
                'queue' => config('queue.default'),
                'cache' => config('cache.default'),
            ],
            'frontend_url' => config('cors.allowed_origins.0'),
            'logging' => [
                'channel' => config('logging.default'),
                'level' => config('logging.channels.'.config('logging.default').'.level', config('app.debug') ? 'debug' : 'info'),
            ],
            'request_id_header' => 'X-Request-ID',
        ],
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

Route::post('/projects', function (Request $request) {
    $data = $request->validate([
        'name' => ['required', 'string', 'max:120'],
        'owner' => ['required', 'string', 'max:120'],
        'region' => ['required', 'string', 'max:120'],
        'grid_region' => ['nullable', 'string', 'max:120'],
        'description' => ['nullable', 'string', 'max:1000'],
        'status' => ['nullable', 'in:active,review,draft'],
    ]);

    $project = Project::query()->create([
        ...$data,
        'id' => meridian_resource_id('prj', $data['name']),
        'status' => $data['status'] ?? 'active',
    ]);

    return response()->json(['data' => $project->loadCount('scenarios')], 201);
});

Route::get('/projects/{project}', function (Project $project) {
    return [
        'data' => $project->load('scenarios'),
    ];
});

Route::delete('/projects/{project}', function (Project $project) {
    $project->delete();

    return response()->noContent();
});

Route::get('/projects/{project}/scenarios', function (Project $project) {
    return [
        'data' => $project->scenarios()
            ->orderBy('name')
            ->get(),
    ];
});

Route::post('/projects/{project}/scenarios', function (Request $request, Project $project) {
    $data = $request->validate([
        'name' => ['required', 'string', 'max:120'],
        'objective' => ['required', 'string', 'max:500'],
        'engine' => ['required', 'in:pypsa,pandapower,pysam,pvlib,osemosys'],
        'status' => ['nullable', 'in:draft,ready,queued,running,complete'],
        'horizon' => ['required', 'string', 'max:40'],
        'annual_demand_mwh' => ['required', 'numeric', 'min:0'],
        'peak_load_mw' => ['required', 'numeric', 'min:0'],
        'renewable_share_target' => ['required', 'numeric', 'min:0', 'max:100'],
        'assumptions' => ['nullable', 'array'],
    ]);

    $scenario = $project->scenarios()->create([
        ...$data,
        'id' => meridian_resource_id('scn', $data['name']),
        'status' => $data['status'] ?? 'ready',
        'assumptions' => $data['assumptions'] ?? [],
    ]);

    return response()->json(['data' => $scenario], 201);
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
