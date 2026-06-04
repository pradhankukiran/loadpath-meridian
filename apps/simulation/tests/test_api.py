from meridian_simulation.app import create_app


def test_health_endpoint():
    client = create_app().test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json == {
        "service": "loadpath-meridian-simulation",
        "status": "ok",
    }


def test_engines_endpoint_includes_pypsa():
    client = create_app().test_client()

    response = client.get("/api/engines")

    assert response.status_code == 200
    assert response.json["data"][0]["id"] == "pypsa"


def test_simulation_submission_returns_queued_job():
    client = create_app().test_client()

    response = client.post(
        "/api/simulations",
        json={
            "project_id": "prj_nw_grid",
            "scenario_id": "scn_base",
            "engine": "pypsa",
            "objective": "Minimise cost while meeting demand",
            "annual_demand_mwh": 1840000,
            "peak_load_mw": 482,
            "renewable_share_target": 76,
            "assumptions": {
                "storage_duration_hours": 6,
                "carbon_price_gbp_per_tonne": 92,
                "grid_import_limit_mw": 310,
            },
        },
    )

    assert response.status_code == 202
    assert response.json["status"] == "complete"
    assert response.json["engine"] == "pypsa"
    assert response.json["progress"] == 100
    assert response.json["model"] == "PyPSA energy-system optimisation"
    assert response.json["links"]["latest_result"] == (
        "/api/projects/prj_nw_grid/scenarios/scn_base/results/latest"
    )

    recent_response = client.get("/api/simulations/recent")
    assert recent_response.json["data"][0]["id"] == response.json["id"]

    result_response = client.get("/api/projects/prj_nw_grid/scenarios/scn_base/results/latest")
    assert result_response.status_code == 200
    assert result_response.json["data"]["status"] == "complete"
    assert len(result_response.json["data"]["dispatch_profile"]) == 24
    assert result_response.json["data"]["generation_mix"][0]["label"] == "Solar"
    assert result_response.json["data"]["cost_breakdown"][0]["label"] == "Generation"


def test_recent_simulations_endpoint_returns_queue_items():
    client = create_app().test_client()

    response = client.get("/api/simulations/recent")

    assert response.status_code == 200
    assert len(response.json["data"]) >= 3
    assert {"id", "status", "progress", "engine"}.issubset(response.json["data"][0])


def test_latest_result_endpoint_returns_summary():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/scenarios/scn_nw_base/results/latest")

    assert response.status_code == 200
    assert response.json["data"]["engine"] == "pypsa"
    assert response.json["data"]["renewable_share_percent"] == 70.4
    assert "generation_mix" in response.json["data"]


def test_latest_result_endpoint_returns_not_found_for_missing_result():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/scenarios/scn_nw_storage/results/latest")

    assert response.status_code == 404
