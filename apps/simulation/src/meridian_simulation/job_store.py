from datetime import UTC, datetime
from uuid import uuid4

from meridian_simulation.results import RECENT_SIMULATION_JOBS


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
    return job


def model_label(engine: str) -> str:
    labels = {
        "pypsa": "PyPSA energy-system optimisation",
        "pandapower": "pandapower grid analysis",
        "pysam": "NREL PySAM performance model",
        "pvlib": "pvlib solar performance model",
        "osemosys": "OSeMOSYS capacity expansion",
    }

    return labels.get(engine, engine)
