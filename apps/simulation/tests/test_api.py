from meridian_simulation.app import create_app
from meridian_simulation.config import Settings


def test_health_endpoint():
    client = create_app().test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json == {
        "service": "loadpath-meridian-simulation",
        "status": "ok",
    }


def test_request_id_header_is_echoed():
    client = create_app().test_client()

    response = client.get("/api/health", headers={"X-Request-ID": "req_test_123"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "req_test_123"


def test_operations_status_endpoint_reports_runtime_configuration():
    app = create_app(
        Settings(
            redis_url="redis://localhost:1/0",
            modal_llm_endpoint="https://modal.example/analyse",
            nrel_api_key="nrel-test",
            eia_api_key=None,
            app_env="production",
            frontend_origins=("https://loadpath.example",),
        )
    )
    client = app.test_client()

    response = client.get("/api/operations/status")

    assert response.status_code == 200
    assert response.json["data"]["service"] == "loadpath-meridian-simulation"
    assert response.json["data"]["status"] == "degraded"
    assert response.json["data"]["environment"] == "production"
    assert response.json["data"]["checks"]["redis"] == "unavailable"
    assert response.json["data"]["checks"]["worker"] == "not_required"
    assert response.json["data"]["redis"]["status"] == "unavailable"
    assert response.json["data"]["worker"]["mode"] == "sync"
    assert response.json["data"]["queue"]["mode"] == "sync"
    assert response.json["data"]["queue"]["counts"]["complete"] >= 1
    assert response.json["data"]["checks"]["modal_llm"] == "configured"
    assert response.json["data"]["frontend_origins"] == ["https://loadpath.example"]
    assert response.json["data"]["request_id_header"] == "X-Request-ID"


def test_cors_headers_allow_configured_frontend_origin():
    app = create_app(
        Settings(
            redis_url="redis://localhost:6379/0",
            modal_llm_endpoint=None,
            nrel_api_key=None,
            eia_api_key=None,
            frontend_origins=("https://loadpath.example",),
        )
    )
    client = app.test_client()

    response = client.get(
        "/api/health",
        headers={"Origin": "https://loadpath.example"},
    )

    assert response.headers["Access-Control-Allow-Origin"] == "https://loadpath.example"


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
    assert result_response.json["data"]["engine_adapter"]["engine"] == "pypsa"
    assert result_response.json["data"]["engine_adapter"]["status"] in {
        "executed",
        "model_built",
        "unavailable",
    }
    assert len(result_response.json["data"]["dispatch_profile"]) == 24
    assert result_response.json["data"]["generation_mix"][0]["label"] == "Solar"
    assert result_response.json["data"]["cost_breakdown"][0]["label"] == "Generation"

    history_response = client.get("/api/projects/prj_nw_grid/scenarios/scn_base/results")
    assert history_response.status_code == 200
    assert history_response.json["data"][0]["job_id"] == response.json["id"]
    assert history_response.json["data"][0]["engine_adapter_status"] in {
        "executed",
        "model_built",
        "unavailable",
    }
    assert history_response.json["data"][0]["total_cost_million"] is not None


def test_project_delete_removes_simulation_records(tmp_path):
    app = create_app(
        Settings(
            redis_url="redis://localhost:1/0",
            modal_llm_endpoint=None,
            nrel_api_key=None,
            eia_api_key=None,
            database_url=f"sqlite:///{tmp_path / 'simulation.db'}",
            artifact_dir=str(tmp_path / "artifacts"),
            sync_jobs=True,
            seed_reference_data=False,
        )
    )
    client = app.test_client()

    client.post(
        "/api/simulations",
        json={
            "project_id": "prj_delete",
            "scenario_id": "scn_delete",
            "engine": "pypsa",
            "objective": "Create records for deletion.",
        },
    )

    response = client.delete("/api/projects/prj_delete")

    assert response.status_code == 200
    assert response.json == {"data": {"deleted_simulation_jobs": 1}}

    result_response = client.get("/api/projects/prj_delete/scenarios/scn_delete/results/latest")
    assert result_response.json == {"data": None}

    recent_response = client.get("/api/simulations/recent")
    assert all(job["project_id"] != "prj_delete" for job in recent_response.json["data"])


def test_recent_simulations_endpoint_returns_queue_items():
    client = create_app().test_client()

    response = client.get("/api/simulations/recent")

    assert response.status_code == 200
    assert len(response.json["data"]) >= 3
    assert {"id", "status", "progress", "engine"}.issubset(response.json["data"][0])


def test_data_connector_contract_endpoint_returns_open_meteo_config():
    client = create_app().test_client()

    response = client.get("/api/data-connectors/open_meteo")

    assert response.status_code == 200
    assert response.json["data"]["source"] == "open_meteo"
    assert response.json["data"]["status"] == "live"


def test_dataset_list_endpoint_returns_empty_list_for_new_scenario():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/scenarios/scn_new/datasets")

    assert response.status_code == 200
    assert response.json == {"data": []}


def test_imported_dataset_summary_is_used_by_generated_result(monkeypatch):
    client = create_app().test_client()

    def fake_import(payload):
        return {
            "id": "dat_test",
            "source": "open_meteo",
            "name": "Open-Meteo weather forecast",
            "location": {
                "label": payload["location_label"],
                "latitude": payload["latitude"],
                "longitude": payload["longitude"],
            },
            "summary": {
                "records": 24,
                "temperature_2m_mean_c": 16.5,
                "wind_speed_10m_mean_kmh": 18.2,
                "shortwave_radiation_mean_wm2": 214.8,
                "shortwave_radiation_peak_wm2": 720.0,
            },
            "sample": [],
        }

    monkeypatch.setattr("meridian_simulation.routes.import_open_meteo_weather", fake_import)

    import_response = client.post(
        "/api/projects/prj_nw_grid/scenarios/scn_weather/datasets/import",
        json={
            "source": "open_meteo",
            "location_label": "Manchester",
            "latitude": 53.48,
            "longitude": -2.24,
            "forecast_days": 1,
        },
    )

    assert import_response.status_code == 201
    assert import_response.json["data"]["summary"]["records"] == 24

    client.post(
        "/api/simulations",
        json={
            "project_id": "prj_nw_grid",
            "scenario_id": "scn_weather",
            "engine": "pypsa",
            "objective": "Use imported weather inputs.",
        },
    )

    result_response = client.get("/api/projects/prj_nw_grid/scenarios/scn_weather/results/latest")

    assert result_response.status_code == 200
    assert result_response.json["data"]["input_data_summary"]["temperature_2m_mean_c"] == 16.5


def test_latest_result_endpoint_returns_summary():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/scenarios/scn_nw_base/results/latest")

    assert response.status_code == 200
    assert response.json["data"]["engine"] == "pypsa"
    assert response.json["data"]["renewable_share_percent"] == 70.4
    assert "generation_mix" in response.json["data"]


def test_result_history_endpoint_returns_completed_runs():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/scenarios/scn_nw_base/results")

    assert response.status_code == 200
    assert response.json["data"][0]["job_id"] == "sim_seed_nw_base"
    assert response.json["data"][0]["engine"] == "pypsa"
    assert response.json["data"][0]["status"] == "complete"
    assert response.json["data"][0]["renewable_share_percent"] == 70.4
    assert response.json["data"][0]["completed_at"] == "2026-06-04T07:20:00+00:00"


def test_latest_result_endpoint_returns_null_for_missing_result():
    client = create_app().test_client()

    response = client.get("/api/projects/prj_nw_grid/scenarios/scn_nw_storage/results/latest")

    assert response.status_code == 200
    assert response.json == {"data": None}
