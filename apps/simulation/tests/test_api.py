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
