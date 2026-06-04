<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_health_endpoint_is_available(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()
            ->assertJson([
                'service' => 'loadpath-meridian-platform',
                'status' => 'ok',
            ]);
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
