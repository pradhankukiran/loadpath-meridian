from meridian_simulation.config import Settings
from meridian_simulation.job_store import complete_job, enqueue_job, latest_result, list_recent_jobs
from meridian_simulation.tasks import run_simulation


def test_async_job_is_persisted_then_completed_by_worker(monkeypatch, tmp_path):
    delayed_jobs = []
    settings = Settings(
        redis_url="redis://localhost:6379/0",
        modal_llm_endpoint=None,
        nrel_api_key=None,
        eia_api_key=None,
        database_url=f"sqlite:///{tmp_path / 'simulation.db'}",
        sync_jobs=False,
    )

    monkeypatch.setattr(run_simulation, "delay", lambda job_id: delayed_jobs.append(job_id))

    job = enqueue_job(
        {
            "project_id": "prj_nw_grid",
            "scenario_id": "scn_async_worker",
            "engine": "pypsa",
            "objective": "Verify persisted async execution.",
            "annual_demand_mwh": 1840000,
            "peak_load_mw": 482,
            "renewable_share_target": 76,
            "assumptions": {
                "storage_duration_hours": 6,
                "grid_import_limit_mw": 310,
            },
        },
        settings,
    )

    assert job["status"] == "queued"
    assert delayed_jobs == [job["id"]]
    assert list_recent_jobs(settings)[0]["status"] == "queued"
    assert latest_result("prj_nw_grid", "scn_async_worker", settings) is None

    completed = complete_job(job["id"], settings)
    result = latest_result("prj_nw_grid", "scn_async_worker", settings)

    assert completed["status"] == "complete"
    assert completed["progress"] == 100
    assert result["status"] == "complete"
    assert result["engine"] == "pypsa"
