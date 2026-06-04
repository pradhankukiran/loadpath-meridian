from meridian_simulation.app import create_app
from meridian_simulation.comparison import compare_project_scenarios


def test_project_comparison_endpoint_returns_indicators():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/comparisons")

    assert response.status_code == 200
    assert response.json["data"]["project_id"] == "prj_nw_grid"
    assert response.json["data"]["scenario_count"] >= 1
    scenario_ids = {
        scenario["scenario_id"]
        for scenario in response.json["data"]["scenarios"]
    }
    assert response.json["data"]["indicators"]["best_value_scenario_id"] in scenario_ids


def test_project_comparison_handles_projects_without_results():
    comparison = compare_project_scenarios("prj_no_results")

    assert comparison["scenario_count"] == 0
    assert comparison["indicators"]["best_value_scenario_id"] is None
    assert "No completed" in comparison["indicators"]["summary"]
