<?php

namespace Tests\Feature;

use Tests\TestCase;

class PlatformApiTest extends TestCase
{
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
        $response = $this->getJson('/api/projects');

        $response->assertOk()
            ->assertJsonPath('data.0.id', 'prj_nw_grid')
            ->assertJsonPath('data.0.status', 'active');
    }

    public function test_subscription_endpoint_exposes_the_current_plan(): void
    {
        $response = $this->getJson('/api/subscriptions/current');

        $response->assertOk()
            ->assertJsonPath('plan', 'private-beta')
            ->assertJsonPath('features.2', 'modal_ai_assistant');
    }
}
