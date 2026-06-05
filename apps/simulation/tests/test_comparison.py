import json
from io import BytesIO
from zipfile import ZipFile

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


def test_project_report_package_endpoint_returns_zip_archive():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/reports/package")

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/zip"
    assert response.headers["Content-Disposition"].startswith(
        "attachment; filename=loadpath-meridian-prj_nw_grid-report-package.zip"
    )

    with ZipFile(BytesIO(response.data)) as archive:
        names = set(archive.namelist())
        assert "manifest.json" in names
        assert "comparison.json" in names
        assert "comparison.csv" in names
        assert "executive-summary.md" in names
        assert "scenarios/scn_nw_base.json" in names

        manifest = json.loads(archive.read("manifest.json"))
        comparison = json.loads(archive.read("comparison.json"))
        csv_text = archive.read("comparison.csv").decode()
        summary = archive.read("executive-summary.md").decode()

    assert manifest["project_id"] == "prj_nw_grid"
    assert comparison["project_id"] == "prj_nw_grid"
    assert "scenario_id,engine,total_cost_million" in csv_text
    assert "Decision Summary" in summary
