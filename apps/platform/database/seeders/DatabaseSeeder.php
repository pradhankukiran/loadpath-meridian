<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->firstOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => 'password',
        ]);

        $projects = [
            [
                'id' => 'prj_nw_grid',
                'name' => 'North West grid reinforcement',
                'owner' => 'Infrastructure Planning',
                'region' => 'United Kingdom',
                'grid_region' => 'GB transmission north-west',
                'description' => 'Network reinforcement study for load growth, renewables, and storage placement.',
                'status' => 'active',
            ],
            [
                'id' => 'prj_solar_storage',
                'name' => 'Solar and storage capacity study',
                'owner' => 'Energy Transition',
                'region' => 'Arizona, United States',
                'grid_region' => 'WECC southwest',
                'description' => 'Hybrid solar and battery sizing study using weather-driven generation assumptions.',
                'status' => 'review',
            ],
            [
                'id' => 'prj_heat_network',
                'name' => 'Urban heat network expansion',
                'owner' => 'City Systems',
                'region' => 'Manchester, United Kingdom',
                'grid_region' => 'Local distribution network',
                'description' => 'District energy expansion scenario for electrified heat and grid import constraints.',
                'status' => 'active',
            ],
        ];

        foreach ($projects as $project) {
            Project::query()->updateOrCreate(['id' => $project['id']], $project);
        }

        $scenarios = [
            [
                'id' => 'scn_nw_base',
                'project_id' => 'prj_nw_grid',
                'name' => '2035 base demand',
                'objective' => 'Minimise system cost while meeting forecast demand.',
                'engine' => 'pypsa',
                'status' => 'ready',
                'horizon' => '2035',
                'annual_demand_mwh' => 1840000,
                'peak_load_mw' => 482,
                'renewable_share_target' => 68,
                'assumptions' => [
                    'storage_duration_hours' => 4,
                    'carbon_price_gbp_per_tonne' => 92,
                    'grid_import_limit_mw' => 350,
                ],
            ],
            [
                'id' => 'scn_nw_storage',
                'project_id' => 'prj_nw_grid',
                'name' => 'Storage-led reinforcement deferral',
                'objective' => 'Test whether storage avoids new transmission capacity.',
                'engine' => 'pypsa',
                'status' => 'running',
                'horizon' => '2035',
                'annual_demand_mwh' => 1840000,
                'peak_load_mw' => 482,
                'renewable_share_target' => 75,
                'assumptions' => [
                    'storage_duration_hours' => 6,
                    'battery_capex_gbp_per_kwh' => 205,
                    'grid_import_limit_mw' => 310,
                ],
            ],
            [
                'id' => 'scn_az_hybrid',
                'project_id' => 'prj_solar_storage',
                'name' => 'PV plus 4-hour battery',
                'objective' => 'Estimate hybrid plant output, curtailment, and storage utilisation.',
                'engine' => 'pysam',
                'status' => 'ready',
                'horizon' => '2028',
                'annual_demand_mwh' => 620000,
                'peak_load_mw' => 155,
                'renewable_share_target' => 82,
                'assumptions' => [
                    'solar_capacity_mw' => 220,
                    'battery_capacity_mwh' => 480,
                    'inverter_loading_ratio' => 1.25,
                ],
            ],
            [
                'id' => 'scn_heat_peak',
                'project_id' => 'prj_heat_network',
                'name' => 'Winter peak electrification',
                'objective' => 'Quantify grid impacts from heat pump and district heat expansion.',
                'engine' => 'pandapower',
                'status' => 'queued',
                'horizon' => '2030',
                'annual_demand_mwh' => 910000,
                'peak_load_mw' => 238,
                'renewable_share_target' => 55,
                'assumptions' => [
                    'heat_pump_cop' => 2.8,
                    'district_heat_share' => 0.42,
                    'grid_voltage_kv' => 33,
                ],
            ],
        ];

        foreach ($scenarios as $scenario) {
            Scenario::query()->updateOrCreate(['id' => $scenario['id']], $scenario);
        }
    }
}
