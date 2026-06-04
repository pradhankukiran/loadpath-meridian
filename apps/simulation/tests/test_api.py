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
        },
    )

    assert response.status_code == 202
    assert response.json["status"] == "queued"
    assert response.json["engine"] == "pypsa"
    assert response.json["links"]["latest_result"] == (
        "/api/projects/prj_nw_grid/scenarios/scn_base/results/latest"
    )


def test_recent_simulations_endpoint_returns_queue_items():
    client = create_app().test_client()

    response = client.get("/api/simulations/recent")

    assert response.status_code == 200
    assert response.json["data"][0]["id"] == "sim_1042"
    assert response.json["data"][0]["progress"] == 64


def test_latest_result_endpoint_returns_summary():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/scenarios/scn_nw_base/results/latest")

    assert response.status_code == 200
    assert response.json["data"]["engine"] == "pypsa"
    assert response.json["data"]["renewable_share_percent"] == 70.4


def test_latest_result_endpoint_returns_not_found_for_missing_result():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/scenarios/scn_nw_storage/results/latest")

    assert response.status_code == 404
