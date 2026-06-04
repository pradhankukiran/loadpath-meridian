from datetime import UTC, datetime
from uuid import uuid4

from meridian_simulation.config import Settings
from meridian_simulation.data_store import latest_dataset_summary
from meridian_simulation.database import (
    create_job_record,
    get_job_payload,
    initialize_database,
    latest_result_record,
    list_recent_job_records,
    mark_job_complete,
    mark_job_failed,
    mark_job_running,
    project_result_records,
)
from meridian_simulation.engine_runner import run_energy_system_simulation


def list_recent_jobs(settings: Settings | None = None) -> list[dict]:
    settings = settings or Settings.from_env()
    initialize_database(settings)
    return list_recent_job_records(settings)


def latest_result(project_id: str, scenario_id: str, settings: Settings | None = None) -> dict | None:
    settings = settings or Settings.from_env()
    initialize_database(settings)
    return latest_result_record(settings, project_id, scenario_id)


def project_results(project_id: str, settings: Settings | None = None) -> list[dict]:
    settings = settings or Settings.from_env()
    initialize_database(settings)
    return project_result_records(settings, project_id)


def enqueue_job(payload: dict, settings: Settings | None = None) -> dict:
    settings = settings or Settings.from_env()
    initialize_database(settings)
    job = {
        "id": f"sim_{uuid4().hex[:12]}",
        "project_id": payload["project_id"],
        "scenario_id": payload["scenario_id"],
        "engine": payload["engine"],
        "model": model_label(payload["engine"]),
        "status": "queued",
        "progress": 0,
        "submitted_at": datetime.now(UTC).isoformat(),
        "objective": payload["objective"],
        "assumptions": payload.get("assumptions", {}),
        "links": {
            "latest_result": (
                f"/api/projects/{payload['project_id']}/scenarios/"
                f"{payload['scenario_id']}/results/latest"
            ),
        },
    }

    create_job_record(settings, job, payload)

    if settings.sync_jobs:
        return complete_job(job["id"], settings)

    from meridian_simulation.tasks import run_simulation

    run_simulation.delay(job["id"])
    return job


def complete_job(job_id: str, settings: Settings | None = None) -> dict:
    settings = settings or Settings.from_env()
    initialize_database(settings)
    payload = get_job_payload(settings, job_id)

    if payload is None:
        return {}

    try:
        mark_job_running(settings, job_id)
        payload["input_data_summary"] = latest_dataset_summary(
            payload["project_id"],
            payload["scenario_id"],
        )
        result = run_energy_system_simulation(payload)
        return mark_job_complete(settings, job_id, result)
    except Exception as exc:
        return mark_job_failed(settings, job_id, str(exc))


def model_label(engine: str) -> str:
    labels = {
        "pypsa": "PyPSA energy-system optimisation",
        "pandapower": "pandapower grid analysis",
        "pysam": "NREL PySAM performance model",
        "pvlib": "pvlib solar performance model",
        "osemosys": "OSeMOSYS capacity expansion",
    }

    return labels.get(engine, engine)
