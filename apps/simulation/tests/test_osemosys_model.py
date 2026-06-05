import pytest

from meridian_simulation.osemosys_model import build_osemosys_data, run_osemosys_capacity_expansion


def test_osemosys_data_is_generated_from_scenario_inputs():
    data = build_osemosys_data({
        "annual_demand_mwh": 500000,
        "renewable_share_target": 80,
        "assumptions": {
            "solar_capacity_factor": 0.2,
            "wind_capacity_factor": 0.4,
            "carbon_price_gbp_per_tonne": 100,
        },
    })

    assert data["annual_demand_mwh"] == 500000
    assert data["renewable_target"] == 0.8
    assert data["technologies"]["solar"]["capacity_factor"] == 0.2
    assert data["technologies"]["gas"]["emissions_tonnes_per_mwh"] == 0.29


def test_osemosys_capacity_expansion_solves_and_writes_artifacts(tmp_path):
    pyomo = pytest.importorskip("pyomo.environ")

    result = run_osemosys_capacity_expansion(
        {
            "project_id": "prj_test",
            "scenario_id": "scn_osemosys",
            "job_id": "sim_test",
            "artifact_dir": str(tmp_path),
            "annual_demand_mwh": 500000,
            "renewable_share_target": 75,
            "assumptions": {
                "solver_name": "appsi_highs",
            },
        },
        {
            "generation_mix": [
                {"label": "Solar", "mwh": 100},
                {"label": "Wind", "mwh": 100},
                {"label": "Storage discharge", "mwh": 50},
                {"label": "Grid imports", "mwh": 100},
            ],
        },
        pyomo,
    )

    assert result["solution"]["termination_condition"].lower() == "optimal"
    assert result["solution"]["renewable_share_percent"] >= 75
    assert result["updates"]["engine_resource_summary"]["source"] == "OSeMOSYS-lite capacity expansion"
    assert len(result["artifacts"]) == 4
    for artifact in result["artifacts"]:
        assert artifact["bytes"] > 0
