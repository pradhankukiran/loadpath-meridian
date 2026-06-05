<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_health_endpoint_is_available(): void
    {
        $response = $this->withHeader('X-Request-ID', 'req_platform_test')->getJson('/api/health');

        $response->assertOk()
            ->assertJson([
                'service' => 'loadpath-meridian-platform',
                'status' => 'ok',
            ])
            ->assertHeader('X-Request-ID', 'req_platform_test');
    }

    public function test_operations_status_endpoint_reports_runtime_configuration(): void
    {
        $response = $this->getJson('/api/operations/status');

        $response->assertOk()
            ->assertJsonPath('data.service', 'loadpath-meridian-platform')
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.checks.database', 'ok')
            ->assertJsonPath('data.frontend_url', 'http://localhost:5173')
            ->assertJsonPath('data.request_id_header', 'X-Request-ID');
    }

    public function test_projects_endpoint_returns_project_summaries(): void
    {
        $this->seed();

        $response = $this->getJson('/api/projects');

        $response->assertOk()
            ->assertJsonPath('data.0.id', 'prj_nw_grid')
            ->assertJsonPath('data.0.status', 'active')
            ->assertJsonPath('data.0.scenarios_count', 2);
    }

    public function test_project_detail_includes_scenarios(): void
    {
        $this->seed();

        $response = $this->getJson('/api/projects/prj_nw_grid');

        $response->assertOk()
            ->assertJsonPath('data.id', 'prj_nw_grid')
            ->assertJsonPath('data.scenarios.0.id', 'scn_nw_base');
    }

    public function test_project_can_be_created(): void
    {
        $response = $this->postJson('/api/projects', [
            'name' => 'Offshore wind grid landing study',
            'owner' => 'Transmission Planning',
            'region' => 'Scotland, United Kingdom',
            'grid_region' => 'GB transmission north',
            'description' => 'Landing point and reinforcement planning study.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Offshore wind grid landing study')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.scenarios_count', 0);
    }

    public function test_scenario_can_be_created_for_project(): void
    {
        $this->seed();

        $response = $this->postJson('/api/projects/prj_nw_grid/scenarios', [
            'name' => 'Hydrogen electrolyser growth',
            'objective' => 'Assess peak load impact from flexible electrolyser demand.',
            'engine' => 'pypsa',
            'horizon' => '2040',
            'annual_demand_mwh' => 2250000,
            'peak_load_mw' => 590,
            'renewable_share_target' => 82,
            'assumptions' => [
                'electrolyser_capacity_mw' => 140,
                'flexible_load_share' => 0.35,
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.project_id', 'prj_nw_grid')
            ->assertJsonPath('data.engine', 'pypsa')
            ->assertJsonPath('data.status', 'ready')
            ->assertJsonPath('data.assumptions.electrolyser_capacity_mw', 140);
    }

    public function test_scenario_creation_validates_engine(): void
    {
        $this->seed();

        $response = $this->postJson('/api/projects/prj_nw_grid/scenarios', [
            'name' => 'Invalid engine test',
            'objective' => 'Reject unsupported engines.',
            'engine' => 'spreadsheet',
            'horizon' => '2035',
            'annual_demand_mwh' => 1,
            'peak_load_mw' => 1,
            'renewable_share_target' => 50,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('engine');
    }

    public function test_scenario_detail_must_belong_to_project(): void
    {
        $this->seed();

        $response = $this->getJson('/api/projects/prj_solar_storage/scenarios/scn_nw_base');

        $response->assertNotFound();
    }

    public function test_subscription_endpoint_exposes_the_current_plan(): void
    {
        $response = $this->getJson('/api/subscriptions/current');

        $response->assertOk()
            ->assertJsonPath('plan', 'private-beta')
            ->assertJsonPath('features.2', 'modal_ai_assistant');
    }
}
