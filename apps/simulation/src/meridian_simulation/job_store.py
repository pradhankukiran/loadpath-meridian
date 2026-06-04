from datetime import UTC, datetime
from uuid import uuid4

from meridian_simulation.engine_runner import run_energy_system_simulation
from meridian_simulation.results import LATEST_RESULTS, RECENT_SIMULATION_JOBS


def list_recent_jobs() -> list[dict]:
    return RECENT_SIMULATION_JOBS


def enqueue_job(payload: dict) -> dict:
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

    RECENT_SIMULATION_JOBS.insert(0, job)
    complete_job(job, payload)
    return job


def complete_job(job: dict, payload: dict) -> None:
    job["status"] = "complete"
    job["progress"] = 100
    job["completed_at"] = datetime.now(UTC).isoformat()
    LATEST_RESULTS[(payload["project_id"], payload["scenario_id"])] = run_energy_system_simulation(payload)


def model_label(engine: str) -> str:
    labels = {
        "pypsa": "PyPSA energy-system optimisation",
        "pandapower": "pandapower grid analysis",
        "pysam": "NREL PySAM performance model",
        "pvlib": "pvlib solar performance model",
        "osemosys": "OSeMOSYS capacity expansion",
    }

    return labels.get(engine, engine)
